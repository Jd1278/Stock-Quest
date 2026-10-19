/* All-Java functional verification. Only dedicated local databases and separate ports. */
const { spawn } = require('node:child_process');
const { randomUUID, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const root = path.resolve(__dirname, '..');
const suffix = process.env.SQ_VERIFY_SUFFIX;
const password = process.env.SQ_VERIFY_DB_PASSWORD;
if (!password || !suffix || !/^[a-z0-9_]{1,30}$/.test(suffix)) throw new Error('Set SQ_VERIFY_DB_PASSWORD and bounded SQ_VERIFY_SUFFIX.');
const dbNames = { people: `sq_test_people_${suffix}`, learning: `sq_test_learning_${suffix}`, simulation: `sq_test_simulation_${suffix}` };
const runId = randomUUID(), checks = [], children = [], clients = [], logs = [];
const output = path.join(root, 'services/personas-capacitacion/target/verification', runId);
fs.mkdirSync(output, { recursive: true });
const api = 'http://127.0.0.1:14400', simulation = 'http://127.0.0.1:14410', learning = 'http://127.0.0.1:14420', people = 'http://127.0.0.1:14430';
const jwtSecret = randomBytes(32).toString('hex'), eventToken = randomBytes(32).toString('hex');
const env = { ...process.env,
  // Deliberately unreachable: all-Java mode must not connect to or query Prisma.
  DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/sq_test_unused', JWT_SECRET: randomBytes(32).toString('hex'),
  PORT: '14400', PEOPLE_BACKEND: 'java', LEARNING_BACKEND: 'java', SIMULATION_BACKEND: 'java', RUN_DB_TESTS: '0',
  PEOPLE_SERVICE_URL: people, LEARNING_SERVICE_URL: learning, SIMULATION_SERVICE_URL: simulation,
  SIMULATION_SERVICE_TOKEN: randomBytes(32).toString('hex'), LEARNING_SERVICE_TOKEN: randomBytes(32).toString('hex'), SIMULATION_EVENT_TOKEN: eventToken,
  PEOPLE_PORT: '14430', LEARNING_PORT: '14420', SIMULATION_PORT: '14410', PEOPLE_JWT_SECRET: jwtSecret,
  IDENTITY_ME_URL: people + '/api/auth/me', SIMULATION_EVENTS_ENABLED: 'true', SIMULATION_EVENTS_TARGET: api + '/internal/events',
};
for (const [key, prefix] of [['people', 'PEOPLE'], ['learning', 'LEARNING'], ['simulation', 'SIMULATION']]) {
  env[prefix + '_JDBC_URL'] = 'jdbc:postgresql://127.0.0.1:5432/' + dbNames[key]; env[prefix + '_DB_USER'] = 'sq_phase4_test'; env[prefix + '_DB_PASSWORD'] = password;
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function launch(name, executable, args) {
  const log = fs.createWriteStream(path.join(output, name + '.log')); logs.push(log);
  const child = spawn(executable, args, { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false }); child.on('error', e => { child.launchError = e; }); children.push(child); return child;
}
function javaService(name, logName = name) { return launch(logName, 'java', ['-jar', path.join(root, 'services', name, 'target', name + '-0.1.0-SNAPSHOT.jar')]); }
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const closed = new Promise(resolve => child.once('close', resolve)); child.kill(); await Promise.race([closed, sleep(5000)]);
}
async function ready(url, child) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (child.launchError || child.exitCode !== null) throw new Error('Verification process exited; inspect its local log.');
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1500) })).ok) return; } catch { /* startup */ }
    await sleep(300);
  }
  throw new Error('Readiness timeout: ' + url);
}
async function http(method, route, token, body, status = 200, origin = api) {
  const response = await fetch(origin + route, { method, redirect: 'error', signal: AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  assert.equal(response.status, status, `${method} ${route}: expected ${status}, got ${response.status}`);
  return response.status === 204 ? null : response.json();
}
async function check(name, action) { await action(); checks.push(name); console.log('PASS ' + name); }
async function db(key) {
  const c = new Client({ host: '127.0.0.1', port: 5432, user: 'sq_phase4_test', password, database: dbNames[key] }); await c.connect(); clients.push(c); return c;
}
async function main() {
  for (const origin of [api, simulation, learning, people]) {
    try { await fetch(origin + '/health/live', { signal: AbortSignal.timeout(500) }); throw new Error('Verification port occupied: ' + origin); }
    catch (e) { if (e.message.startsWith('Verification port')) throw e; }
  }
  const edge = launch('edge', process.execPath, ['--import', 'tsx', path.join(root, 'backend/src/server.ts')]);
  const simChild = javaService('simulacion-logistica'), learnChild = javaService('aprendizaje-evaluacion'); let peopleChild = javaService('personas-capacitacion');
  await Promise.all([ready(api + '/api/health', edge), ready(simulation + '/health/ready', simChild), ready(learning + '/health/ready', learnChild), ready(people + '/health/ready', peopleChild)]);
  const peopleDb = await db('people'), learnDb = await db('learning'), simDb = await db('simulation');
  const accountPassword = randomBytes(24).toString('hex'), hash = await bcrypt.hash(accountPassword, 12);
  const managerId = 'manager-' + runId, leaderId = 'leader-' + runId, otherLeaderId = 'other-' + runId;
  for (const [id, role] of [[managerId, 'GESTOR_PEDAGOGICO'], [leaderId, 'LIDER'], [otherLeaderId, 'LIDER']]) {
    await peopleDb.query('INSERT INTO people_users(id,name,document,email,company,password_hash,role,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())',
      [id, 'Verification ' + role, randomBytes(12).toString('hex'), id + '@example.test', 'Verification', hash, role]);
  }
  const login = (email, pass = accountPassword) => http('POST', '/api/auth/login', null, { email, password: pass });
  const manager = (await login(managerId + '@example.test')).token, leader = (await login(leaderId + '@example.test')).token, otherLeader = (await login(otherLeaderId + '@example.test')).token;
  const email = 'worker-' + runId + '@example.test';
  const registration = { name: 'Aprendiz verificación', document: randomBytes(12).toString('hex'), email, company: 'Verification', password: accountPassword };
  const user = await http('POST', '/api/users', leader, registration, 201); let token = (await login(email)).token;
  const publicRegistration = { ...registration, document: randomBytes(12).toString('hex'), email: 'public-' + runId + '@example.test' };
  const outsider = await http('POST', '/api/auth/register', null, publicRegistration, 201);
  const outsiderToken = (await login(publicRegistration.email)).token;
  await check('edge-operates-without-a-prisma-connection', async () => { assert.equal((await http('GET', '/api/health')).status, 'ok'); });
  await check('bcrypt-node-java-and-jwt-contract-compatible', async () => {
    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'], issuer: 'stock-quest', audience: 'stock-quest-web' }); assert.equal(decoded.sub, user.id); assert.equal(decoded.version, 0);
    const profile = await http('GET', '/api/auth/me', token); assert.equal(profile.id, user.id); assert(!('passwordHash' in profile)); assert(!('tokenVersion' in profile));
    await http('POST', '/api/auth/login', null, { email, password: 'wrong-password' }, 401);
  });
  await check('registration-uniqueness-and-role-injection-protection', async () => {
    assert.equal(outsider.role, 'APRENDIZ');
    await http('POST', '/api/auth/register', null, publicRegistration, 409);
    await http('POST', '/api/auth/register', null, { ...publicRegistration, role: 'LIDER' }, 400);
  });
  let group;
  await check('groups-memberships-idempotence-and-public-shape', async () => {
    group = await http('POST', '/api/groups', leader, { name: 'Grupo verificación' }, 201);
    await http('PATCH', '/api/groups/' + group.id, leader, { name: 'Grupo actualizado' });
    const membership = await http('POST', `/api/groups/${group.id}/members`, leader, { userId: user.id }); assert.equal(membership.groupId, group.id);
    await http('POST', `/api/groups/${group.id}/members`, leader, { userId: user.id });
    const groups = await http('GET', '/api/groups', leader), found = groups.find(g => g.id === group.id);
    assert.equal(found.members.length, 1); assert.equal(found.members[0].user.id, user.id); assert(!('passwordHash' in found.members[0].user));
    const facts = (await peopleDb.query("SELECT count(*)::int AS n FROM people_outbox WHERE aggregate_id=$1 AND event_type='MiembroAsignado'", [group.id])).rows[0].n; assert.equal(facts, 1);
  });
  await check('leader-boundaries-and-group-role-restrictions', async () => {
    await http('GET', '/api/groups', token, undefined, 403);
    await http('PATCH', '/api/groups/' + group.id, otherLeader, { name: 'Forbidden' }, 404);
    await http('POST', `/api/groups/${group.id}/members`, leader, { userId: outsider.id }, 404);
    await http('PATCH', '/api/users/' + user.id, otherLeader, { active: false }, 404);
    await http('GET', '/api/reports/' + user.id, otherLeader, undefined, 404);
  });
  const position = Number((await learnDb.query('SELECT COALESCE(MAX(position),0)+1 AS n FROM learning_modules')).rows[0].n);
  const module = await http('POST', '/api/admin/modules', manager, { title: 'Contenido de prueba', description: 'Integración de identidad', position, published: true }, 201);
  const lesson = await http('POST', '/api/admin/lessons', manager, { moduleId: module.id, title: 'Lección', body: 'Texto', position: 1, minutes: 5 }, 201);
  const challenge = await http('POST', '/api/admin/challenges', manager, { lessonId: lesson.id, question: '¿Respuesta?', options: ['A', 'B'], correctIndex: 0, explanation: 'A es correcta.' }, 201);
  await check('java-identity-authorizes-learning-and-administration', async () => {
    await http('POST', '/api/admin/modules', token, {}, 403);
    const answer = await http('POST', `/api/challenges/${challenge.id}/attempts`, token, { answer: 0 }, 201); assert.equal(answer.score, 100);
    await http('POST', `/api/lessons/${lesson.id}/complete`, token); assert.equal((await http('GET', '/api/progress', token)).xp, 70);
  });
  const scenario = await http('POST', '/api/admin/scenarios', manager, { title: 'Simulación', description: 'Identidad Java', initialStock: 10, demand: [5, 8, 4], leadTime: 2, unitCost: 2, salePrice: 5, holdingCost: 1, shortageCost: 3, orderCost: 4, maxOrder: 20, published: true }, 201);
  let run = await http('POST', '/api/simulations', token, { scenarioId: scenario.id }, 201);
  for (const [day, quantity] of [[0, 6], [1, 0], [2, 0]]) run = await http('POST', `/api/simulations/${run.id}/decisions`, token, { day, quantity });
  await check('all-three-java-services-compose-progress-and-reports', async () => {
    assert.equal(run.result.score, 86); const progress = await http('GET', '/api/progress', token); assert.equal(progress.xp, 156); assert.equal(progress.passed, true);
    const individual = await http('GET', '/api/reports/' + user.id, leader); assert.equal(individual.progress.xp, 156); assert.equal(individual.activities.length, 1);
    const team = await http('GET', '/api/reports', leader); assert.equal(team.find(u => u.id === user.id).progress.simulations, 1);
    await http('GET', '/api/simulations/' + run.id, outsiderToken, undefined, 404);
  });
  await check('simulation-event-delivered-to-java-learning', async () => {
    let delivered = false; const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const source = (await simDb.query('SELECT status FROM simulation_outbox WHERE aggregate_id=$1', [run.id])).rows;
      const target = (await learnDb.query('SELECT event_id FROM learning_simulation_inbox WHERE simulation_id=$1', [run.id])).rows;
      if (source[0]?.status === 'DELIVERED' && target.length === 1) { delivered = true; break; } await sleep(300);
    }
    assert(delivered, 'Simulation event did not reach the Java inbox.');
  });
  await check('logout-revokes-at-edge-and-dependent-services', async () => {
    await http('POST', '/api/auth/logout', token, undefined, 204);
    await http('GET', '/api/auth/me', token, undefined, 401);
    await http('GET', '/api/modules', token, undefined, 401, learning);
    await http('GET', '/api/simulations/scenarios', token, undefined, 401, simulation);
    token = (await login(email)).token;
  });
  await check('deactivation-reactivation-never-restores-old-session', async () => {
    const old = token;
    await http('PATCH', '/api/users/' + user.id, leader, { active: false });
    await http('GET', '/api/progress', old, undefined, 401);
    await http('POST', '/api/auth/login', null, { email, password: accountPassword }, 401);
    await http('PATCH', '/api/users/' + user.id, leader, { active: true });
    await http('GET', '/api/auth/me', old, undefined, 401); token = (await login(email)).token;
    assert.equal((await peopleDb.query("SELECT count(*)::int AS n FROM people_outbox WHERE aggregate_id=$1 AND event_type='UsuarioDesactivado'", [user.id])).rows[0].n, 1);
  });
  let newPassword;
  await check('profile-sensitive-changes-require-password-and-revoke-session', async () => {
    await http('PATCH', '/api/users/me', token, { phone: null });
    await http('PATCH', '/api/users/me', token, { password: 'unauthorized-password-change' }, 400);
    newPassword = randomBytes(24).toString('hex'); const old = token;
    await http('PATCH', '/api/users/me', token, { password: newPassword, currentPassword: accountPassword });
    await http('GET', '/api/auth/me', old, undefined, 401); token = (await login(email, newPassword)).token;
  });
  await check('membership-removal-and-group-deletion-contract', async () => {
    await http('DELETE', `/api/groups/${group.id}/members/${user.id}`, leader, undefined, 204);
    await http('DELETE', `/api/groups/${group.id}/members/${user.id}`, leader, undefined, 204);
    await http('DELETE', '/api/groups/' + group.id, leader, undefined, 204);
    assert(!(await http('GET', '/api/groups', leader)).some(g => g.id === group.id));
  });
  await check('identity-outage-is503-without-legacy-fallback', async () => {
    await stop(peopleChild); await http('GET', '/api/modules', token, undefined, 503);
    await http('GET', '/api/simulations/scenarios', token, undefined, 503, simulation);
  });
  peopleChild = javaService('personas-capacitacion', 'personas-restarted'); await ready(people + '/health/ready', peopleChild);
  await check('identity-restart-preserves-accounts-revocation-and-progress', async () => {
    assert.equal((await http('GET', '/api/auth/me', token)).id, user.id);
    assert.equal((await http('GET', '/api/progress', token)).xp, 156);
    assert.equal((await http('GET', '/api/reports/' + user.id, leader)).progress.xp, 156);
    const version = (await peopleDb.query('SELECT token_version FROM people_users WHERE id=$1', [user.id])).rows[0].token_version; assert.equal(version, 3);
  });
  return { userId: user.id, simulationId: run.id };
}
let result;
main().then(ids => { result = { status: 'PASS', checks, ...ids }; }).catch(e => { result = { status: 'FAIL', checks, error: e.code ? 'PostgreSQL ' + e.code : e.message }; process.exitCode = 1; })
 .finally(async () => {
  for (const child of children.reverse()) await stop(child); for (const client of clients) await client.end().catch(() => {}); for (const log of logs) log.end();
  const report = { ...result, runId, databases: dbNames, ports: [14400, 14410, 14420, 14430], finishedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify({ ...report, reportPath: path.join(output, 'report.json') }, null, 2));
 });
