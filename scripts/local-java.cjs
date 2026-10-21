/* Windows local integration environment. Secrets are DPAPI-encrypted for the current user. */
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { randomBytes, randomUUID, timingSafeEqual } = require('node:crypto');
const net = require('node:net');
const httpServer = require('node:http');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const assert = require('node:assert/strict');
const content = require('../content/stockquest.json');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, '.stockquest-local');
const configFile = path.join(directory, 'config.dpapi');
const services = { people: 'personas-capacitacion', learning: 'aprendizaje-evaluacion', simulation: 'simulacion-logistica' };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const secret = () => randomBytes(32).toString('hex');
function powershell(code, input) {
  return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', code], { input, encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
function save(config) {
  fs.mkdirSync(directory, { recursive: true });
  const encrypted = powershell('Add-Type -AssemblyName System.Security; $raw=[Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd()); [Console]::Out.Write([Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($raw,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)))', JSON.stringify(config));
  fs.writeFileSync(configFile + '.new', encrypted, { mode: 0o600 });
  fs.renameSync(configFile + '.new', configFile);
}
function load() {
  const raw = powershell('Add-Type -AssemblyName System.Security; $raw=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Console]::Out.Write([Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Unprotect($raw,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)))', fs.readFileSync(configFile, 'utf8'));
  return JSON.parse(Buffer.from(raw,'base64').toString('utf8'));
}
async function connect(config, key) {
  const client = new Client({ host: '127.0.0.1', port: 5432, database: config.databases[key], ...config.roles[key], connectionTimeoutMillis: 5000 });
  await client.connect(); return client;
}
async function prepare() {
  if (fs.existsSync(configFile)) throw new Error('Local configuration already exists. Use start/status; preparation never overwrites it.');
  if (!process.env.SQ_LOCAL_DB_ADMIN_PASSWORD) throw new Error('Set SQ_LOCAL_DB_ADMIN_PASSWORD in this process.');
  const suffix = process.env.SQ_LOCAL_SUFFIX || new Date().toISOString().slice(0,10).replaceAll('-', '');
  if (!/^[a-z0-9_]{1,20}$/.test(suffix)) throw new Error('Invalid SQ_LOCAL_SUFFIX.');
  const config = { version: 1, root, suffix, seeded: false, controlToken: secret(), jwtSecret: secret(), simulationToken: secret(), learningToken: secret(), eventToken: secret(),
    progressToken: secret(), progressEnabled: true, reportsMode: 'projection',
    ports: { edge: 14600, simulation: 14610, learning: 14620, people: 14630, web: 5174, control: 14699 }, roles: {}, databases: {}, accounts: {} };
  for (const key of Object.keys(services)) {
    config.databases[key] = `stockquest_phase6_${key}_${suffix}`;
    config.roles[key] = { user: `sq6_${key}_${suffix}`, password: secret() };
  }
  for (const [key, role] of [['manager', 'GESTOR_PEDAGOGICO'], ['leader', 'LIDER'], ['learner', 'APRENDIZ']])
    config.accounts[key] = { id: randomUUID(), role, email: `${key}.fase6@example.test`, password: secret() };
  const admin = new Client({ host: '127.0.0.1', port: 5432, database: 'postgres', user: process.env.SQ_LOCAL_DB_ADMIN_USER || 'postgres', password: process.env.SQ_LOCAL_DB_ADMIN_PASSWORD, connectionTimeoutMillis: 5000 });
  await admin.connect();
  try {
    // Complete the collision audit before creating anything. Never reuse arbitrary databases/roles.
    for (const key of Object.keys(services)) {
      if ((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [config.databases[key]])).rowCount
        || (await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [config.roles[key].user])).rowCount) throw new Error('Local database/role already exists; inspect before preparing another suffix.');
    }
    // Save a recoverable, encrypted manifest before DDL; no plaintext credential file is created.
    config.prepared = false; save(config);
    for (const key of Object.keys(services)) {
      const db = config.databases[key], role = config.roles[key];
      await admin.query(`CREATE ROLE "${role.user}" LOGIN PASSWORD '${role.password}' NOSUPERUSER NOCREATEDB NOCREATEROLE`);
      await admin.query(`CREATE DATABASE "${db}" OWNER "${role.user}"`);
      await admin.query(`REVOKE CONNECT ON DATABASE "${db}" FROM PUBLIC`);
      await admin.query(`GRANT CONNECT ON DATABASE "${db}" TO "${role.user}"`);
    }
    config.prepared = true; save(config);
    console.log(JSON.stringify({ prepared: true, databases: config.databases, ports: config.ports, credentials: 'Windows DPAPI; use credentials <manager|leader|learner> to copy a password locally.' }, null, 2));
  } finally { await admin.end(); }
}
function origins(c) { return Object.fromEntries(Object.entries(c.ports).map(([key, port]) => [key, `http://127.0.0.1:${port}`])); }
async function request(config, method, route, token, body, expected = 200, origin = 'edge') {
  const response = await fetch(origins(config)[origin] + route, { method, signal: AbortSignal.timeout(15000), redirect: 'error',
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Correlation-Id': 'phase6-' + randomUUID(), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (response.status !== expected) throw new Error(`${method} ${route}: expected ${expected}, received ${response.status}`);
  return response.status === 204 ? null : response.json();
}
const login = (c, account) => request(c, 'POST', '/api/auth/login', null, { email: account.email, password: account.password });
async function seed(config) {
  const client = await connect(config, 'people');
  try {
    for (const [key, account] of Object.entries(config.accounts)) {
      const existing = await client.query('SELECT id,role FROM people_users WHERE email=$1', [account.email]);
      if (existing.rowCount) {
        assert.equal(existing.rows[0].id, account.id); assert.equal(existing.rows[0].role, account.role); continue;
      }
      await client.query('INSERT INTO people_users(id,name,document,email,company,password_hash,role,created_at,leader_id) VALUES($1,$2,$3,$4,$5,$6,$7,NOW(),$8)',
        [account.id, {manager:'Gestor fase 6',leader:'Líder fase 6',learner:'Aprendiz fase 6'}[key], 'SQ6-' + key, account.email, 'Stock Quest', await bcrypt.hash(account.password, 12), account.role,
          key === 'learner' ? config.accounts.leader.id : null]);
    }
  } finally { await client.end(); }
  const token = (await login(config, config.accounts.manager)).token;
  // Resume partial initial loading, preserving edits to existing content instead of overwriting it.
  let panel = await request(config, 'GET', '/api/admin', token);
  for (const [i, item] of content.lessons.entries()) {
    let module = panel.modules.find(m => m.position === i + 1);
    if (module && module.title !== item.title) throw new Error('Content position occupied by a different module; review manually.');
    module ||= await request(config, 'POST', '/api/admin/modules', token, { title: item.title, description: item.description, position: i + 1, published: true }, 201);
    let lesson = (module.lessons || []).find(l => l.position === 1);
    if (lesson && lesson.title !== item.lesson) throw new Error('Lesson position occupied; review manually.');
    lesson ||= await request(config, 'POST', '/api/admin/lessons', token, { moduleId: module.id, title: item.lesson, body: item.body, position: 1, minutes: 5 }, 201);
    if (!(lesson.challenges || []).some(c => c.question === item.question))
      await request(config, 'POST', '/api/admin/challenges', token, { lessonId: lesson.id, question: item.question, options: item.options, correctIndex: item.correct, explanation: item.explanation }, 201);
  }
  for (const { id: _id, ...scenario } of content.scenarios) {
    if (!panel.scenarios.some(s => s.title === scenario.title)) await request(config, 'POST', '/api/admin/scenarios', token, scenario, 201);
  }
  panel = await request(config, 'GET', '/api/admin', token);
  assert.equal(panel.modules.length, 9); assert.equal(panel.modules.flatMap(m => m.lessons).length, 9);
  assert.equal(panel.modules.flatMap(m => m.lessons.flatMap(l => l.challenges)).length, 9);
  assert.equal(panel.scenarios.filter(s => s.published).length, 2);
  config.seeded = true; save(config);
  fs.writeFileSync(path.join(directory, 'content-inventory.json'), JSON.stringify({ modules: panel.modules.map(m => ({ id: m.id, title: m.title, lessons: m.lessons.length })), scenarios: panel.scenarios.map(s => ({ id: s.id, title: s.title })), videos: 0 }, null, 2));
}
async function available(port) {
  await new Promise((resolve, reject) => { const server = net.createServer(); server.once('error', reject); server.listen(port, '127.0.0.1', () => server.close(resolve)); });
}
async function control(config, method, route) {
  const response = await fetch(origins(config).control + route, { method, headers: { Authorization: 'Bearer ' + config.controlToken }, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error('Local supervisor rejected the request.'); return response.json();
}
async function start(config) {
  if (!config.prepared) throw new Error('Preparation is incomplete; inspect the encrypted manifest and database roles.');
  try { const status=await control(config,'GET','/status');if(status.ready&&!status.stopping){console.log(JSON.stringify(status,null,2));return;}throw new Error('Existing supervisor is not ready; use status/stop before starting.'); }
  catch(error) {if(error.message==='Existing supervisor is not ready; use status/stop before starting.')throw error; /* reject occupied ports below */ }
  for (const port of Object.values(config.ports)) await available(port);
  for (const name of Object.values(services)) if (!fs.existsSync(path.join(root, 'services', name, 'target', name + '-0.1.0-SNAPSHOT.jar'))) throw new Error('Build Java services before start.');
  const out = fs.openSync(path.join(directory, 'supervisor.log'), 'a');
  const child = spawn(process.execPath, [__filename, 'serve'], { cwd: root, detached: true, windowsHide: true, stdio: ['ignore', out, out] }); child.unref(); fs.closeSync(out);
  for (let i = 0; i < 90; i++) {
    try { const status = await control(config, 'GET', '/status'); if (status.ready) { console.log(JSON.stringify(status, null, 2)); return; } if (status.error) throw new Error(status.error); }
    catch (error) { if (error.message === 'Local environment failed; inspect supervisor.log.') throw error; }
    await sleep(1000);
  }
  throw new Error('Local startup timed out; inspect .stockquest-local/supervisor.log.');
}
async function serve(config) {
  const children = new Map(), streams = []; let ready = false, failed = false, stopping = false;
  const origin = origins(config);
  const env = { ...process.env,
    PORT: String(config.ports.edge), FRONTEND_URL: origin.web,
    PEOPLE_SERVICE_URL: origin.people, LEARNING_SERVICE_URL: origin.learning, SIMULATION_SERVICE_URL: origin.simulation,
    IDENTITY_ME_URL: origin.people + '/api/auth/me', PEOPLE_JWT_SECRET: config.jwtSecret,
    LEARNING_SERVICE_TOKEN: config.learningToken, SIMULATION_SERVICE_TOKEN: config.simulationToken, SIMULATION_EVENT_TOKEN: config.eventToken,
    PEOPLE_SERVICE_TOKEN: config.progressToken || '', PEOPLE_REPORTS_MODE: config.reportsMode || 'http',
    LEARNING_PROGRESS_ENABLED: String(config.progressEnabled === true), LEARNING_PROGRESS_TARGET: origin.people + '/internal/progress-events', LEARNING_PROGRESS_TOKEN: config.progressToken || '',
    SIMULATION_EVENTS_ENABLED: 'true', SIMULATION_EVENTS_TARGET: origin.learning + '/internal/events',
    VITE_API_URL: '/api', SQ_API_PROXY_TARGET: origin.edge, RUN_DB_TESTS: '0' };
  for (const [key, prefix] of [['people','PEOPLE'],['learning','LEARNING'],['simulation','SIMULATION']]) {
    env[prefix + '_PORT'] = String(config.ports[key]); env[prefix + '_JDBC_URL'] = 'jdbc:postgresql://127.0.0.1:5432/' + config.databases[key];
    env[prefix + '_DB_USER'] = config.roles[key].user; env[prefix + '_DB_PASSWORD'] = config.roles[key].password;
  }
  function launch(key) {
    const log = fs.createWriteStream(path.join(directory, key + '.log'), { flags: 'a' }); streams.push(log);
    const command = key in services ? 'java' : process.execPath;
    const args = key in services ? ['-Xms32m','-Xmx192m','-Xss512k','-XX:MaxMetaspaceSize=128m','-XX:ReservedCodeCacheSize=48m','-XX:ActiveProcessorCount=2',
      '-XX:ErrorFile='+path.join(directory,key+'-hs_err_pid%p.log'),'-jar', path.join(root,'services',services[key],'target',services[key] + '-0.1.0-SNAPSHOT.jar')]
      : key === 'edge' ? ['--import','tsx',path.join(root,'gateway/src/server.ts')]
      : [path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',String(config.ports.web),'--strictPort'];
    // The HTTP edge receives service origins/tokens, never database or signing credentials.
    const edgeKeys = ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','NODE_ENV',
      'PORT','FRONTEND_URL','PEOPLE_SERVICE_URL','LEARNING_SERVICE_URL','SIMULATION_SERVICE_URL','LEARNING_SERVICE_TOKEN','SIMULATION_SERVICE_TOKEN'];
    const childEnv = key === 'edge' ? Object.fromEntries(edgeKeys.filter(k => env[k] !== undefined).map(k => [k,env[k]])) : env;
    const child = spawn(command, args, { cwd: key === 'web' ? path.join(root,'frontend') : root, env: childEnv, windowsHide: true, stdio: ['ignore','pipe','pipe'] });
    child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false }); child.on('error', () => { failed = true; });
    child.on('exit',()=>{if(!stopping&&children.get(key)===child)ready=false;});children.set(key,child);return child;
  }
  async function stopChild(key) {
    const child = children.get(key); if (!child || child.exitCode !== null || child.signalCode !== null) return;
    const closed = new Promise(resolve => child.once('close',resolve)); child.kill(); await Promise.race([closed,sleep(5000)]);
    if (child.exitCode === null && child.signalCode === null) throw new Error('Child process did not stop: ' + key);
  }
  async function wait(key) {
    const route = key === 'edge' ? '/api/health' : key === 'web' ? '/' : '/health/ready';
    for (let i=0;i<100;i++) {
      const child=children.get(key); if (failed || child.exitCode !== null || child.signalCode !== null) throw new Error('Local process failed: ' + key);
      try {if ((await fetch(origin[key]+route,{signal:AbortSignal.timeout(1500)})).ok)return;}catch { /* startup */ }
      await sleep(400);
    }throw new Error('Readiness failed: ' + key);
  }
  async function shutdown() {
    if(stopping)return; stopping=true;ready=false;
    for(const key of ['web','edge','simulation','learning','people']) await stopChild(key);
    for(const log of streams)log.end(); server.close();
  }
  const server=httpServer.createServer(async(req,res)=>{
    const actual=Buffer.from(req.headers.authorization||''), expected=Buffer.from('Bearer '+config.controlToken);
    res.setHeader('Content-Type','application/json');
    if(actual.length!==expected.length||!timingSafeEqual(actual,expected)){res.writeHead(401);res.end('{"error":"unauthorized"}');return;}
    try {
      if(req.method==='GET'&&req.url==='/status'){res.end(JSON.stringify({ready,stopping,edgeEntrypoint:'gateway/src/server.ts',reportsMode:env.PEOPLE_REPORTS_MODE,progressEventsEnabled:config.progressEnabled === true,eventTarget:env.SIMULATION_EVENTS_TARGET,error:failed?'Local environment failed; inspect supervisor.log.':undefined,web:origin.web,databases:config.databases,
        processes:Object.fromEntries([...children].map(([k,v])=>[k,{pid:v.pid,running:v.exitCode===null&&v.signalCode===null}]))}));return;}
      if(req.method==='POST'&&req.url==='/stop'){res.end('{"stopping":true}');await shutdown();return;}
      const paused=req.method==='POST'&&req.url.match(/^\/pause\/(people|learning|simulation|edge)$/);
      if(paused){ready=false;await stopChild(paused[1]);res.end('{"paused":true}');return;}
      const match=req.method==='POST'&&req.url.match(/^\/restart\/(people|learning|simulation|edge)$/);
      if(match){ready=false;await stopChild(match[1]);launch(match[1]);await wait(match[1]);ready=true;res.end('{"restarted":true}');return;}
      res.writeHead(404);res.end('{"error":"not found"}');
    }catch{res.writeHead(503);res.end('{"error":"local operation failed"}');}
  });
  await new Promise(resolve=>server.listen(config.ports.control,'127.0.0.1',resolve));
  process.on('SIGTERM',()=>shutdown().catch(()=>{}));process.on('SIGINT',()=>shutdown().catch(()=>{}));
  try {
    for(const key of ['people','learning','simulation','edge'])launch(key);
    await Promise.all(['people','learning','simulation','edge'].map(wait));
    if(!config.seeded)await seed(config);
    launch('web');await wait('web');ready=true;console.log('Local all-Java environment ready at '+origin.web);
  }catch(error){failed=true;console.error(error.code?'Local setup error: '+error.code:error.message);for(const key of [...children.keys()].reverse())await stopChild(key);}
}
async function main() {
  const command=process.argv[2];
  if(command==='prepare')return prepare();
  const config=load();if(config.root!==root)throw new Error('Configuration belongs to a different checkout.');
  if(command==='start')return start(config);
  if(command==='serve')return serve(config);
  if(command==='status')return console.log(JSON.stringify(await control(config,'GET','/status'),null,2));
  if(command==='stop') {
    await control(config,'POST','/stop');
    for(let i=0;i<40;i++){try{await control(config,'GET','/status');}catch{console.log('{"stopped":true}');return;}await sleep(250);}
    throw new Error('Supervisor is still stopping; inspect status before restarting.');
  }
  if(command==='restart'&&[...Object.keys(services),'edge'].includes(process.argv[3]))return console.log(JSON.stringify(await control(config,'POST','/restart/'+process.argv[3])));
  if(command==='credentials') {
    const account=config.accounts[process.argv[3]];if(!account)throw new Error('Choose manager, leader or learner.');
    powershell('Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Clipboard]::SetText([Console]::In.ReadToEnd())',account.password);
    console.log(JSON.stringify({email:account.email,role:account.role,password:'Copied to Windows clipboard; not printed.'}));return;
  }
  throw new Error('Use prepare | start | status | stop | restart <people|learning|simulation|edge> | credentials <manager|leader|learner>.');
}
if(require.main===module)main().catch(e=>{console.error(e.code?'Local environment error: '+e.code:e.message);process.exitCode=1;});
module.exports={load,save,connect,request,login,control,origins};
