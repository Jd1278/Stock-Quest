/* Real HTTP/PostgreSQL verification on separate ports and dedicated databases only. */
const { spawn } = require('node:child_process');
const { randomUUID, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const root = path.resolve(__dirname, '..');
const suffix = process.env.SQ_VERIFY_SUFFIX;
const password = process.env.SQ_VERIFY_DB_PASSWORD;
if (!password || !suffix || !/^[a-z0-9_]{1,30}$/.test(suffix)) throw new Error('Set SQ_VERIFY_DB_PASSWORD and bounded SQ_VERIFY_SUFFIX.');
const dbNames = { learning: `sq_test_learning_${suffix}`, simulation: `sq_test_simulation_${suffix}`, backend: `sq_test_backend_${suffix}` };
const runId = randomUUID();
const output = path.join(root, 'services/aprendizaje-evaluacion/target/verification', runId);
fs.mkdirSync(output, { recursive: true });
const children = [], clients = [], streams = [];
const checks = [];
const api = 'http://127.0.0.1:14000';
const sim = 'http://127.0.0.1:14010';
const learning = 'http://127.0.0.1:14020';
const tokenSimulation = randomBytes(32).toString('hex');
const tokenLearning = randomBytes(32).toString('hex');
const tokenEvents = randomBytes(32).toString('hex');
const env = { ...process.env, DATABASE_URL: `postgresql://sq_phase4_test:${encodeURIComponent(password)}@127.0.0.1:5432/${dbNames.backend}`,
  JWT_SECRET: randomBytes(32).toString('hex'), PORT: '14000', RUN_DB_TESTS: '0', SIMULATION_BACKEND: 'java', LEARNING_BACKEND: 'java',
  SIMULATION_SERVICE_URL: sim, LEARNING_SERVICE_URL: learning, SIMULATION_SERVICE_TOKEN: tokenSimulation, LEARNING_SERVICE_TOKEN: tokenLearning,
  SIMULATION_EVENT_TOKEN: tokenEvents, SIMULATION_PORT: '14010', LEARNING_PORT: '14020', SIMULATION_EVENTS_ENABLED: 'true',
  SIMULATION_EVENTS_TARGET: api + '/internal/events', IDENTITY_ME_URL: api + '/api/auth/me',
  SIMULATION_JDBC_URL: `jdbc:postgresql://127.0.0.1:5432/${dbNames.simulation}`, SIMULATION_DB_USER: 'sq_phase4_test', SIMULATION_DB_PASSWORD: password,
  LEARNING_JDBC_URL: `jdbc:postgresql://127.0.0.1:5432/${dbNames.learning}`, LEARNING_DB_USER: 'sq_phase4_test', LEARNING_DB_PASSWORD: password };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function launch(name, executable, args) {
  const log = fs.createWriteStream(path.join(output, name + '.log'));
  streams.push(log);
  const child = spawn(executable, args, { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
  child.on('error', error => { child.launchError = error; });
  children.push(child); return child;
}
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const closed = new Promise(resolve => child.once('close', resolve)); child.kill();
  await Promise.race([closed, sleep(5000)]);
}
async function ready(url) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (children.some(c => c.launchError || c.exitCode !== null)) throw new Error('A verification process exited; inspect local logs.');
    try { const r = await fetch(url, { signal: AbortSignal.timeout(2000) }); if (r.ok) return; } catch { /* startup */ }
    await sleep(300);
  }
  throw new Error('Timed out waiting for verification readiness: ' + url);
}
async function http(method, route, token, body, status = 200) {
  const response = await fetch(api + route, { method, redirect: 'error', signal: AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  assert.equal(response.status, status, `${method} ${route}: expected ${status}, got ${response.status}`);
  return response.status === 204 ? null : response.json();
}
async function check(name, action) { await action(); checks.push(name); console.log('PASS ' + name); }
async function db(key) {
  const client = new Client({ host: '127.0.0.1', port: 5432, user: 'sq_phase4_test', password, database: dbNames[key] });
  await client.connect(); clients.push(client); return client;
}
async function main() {
  const backDb = await db('backend'), learnDb = await db('learning'), simDb = await db('simulation');
  for (const endpoint of [api, sim, learning]) {
    try { await fetch(endpoint + '/health/live', { signal: AbortSignal.timeout(500) }); throw new Error('Verification port already occupied: ' + endpoint); }
    catch (e) { if (e.message.startsWith('Verification port')) throw e; }
  }
  launch('backend', process.execPath, ['--import', 'tsx', path.join(root, 'backend/src/server.ts')]);
  const simulation = launch('simulation', 'java', ['-jar', path.join(root, 'services/simulacion-logistica/target/simulacion-logistica-0.1.0-SNAPSHOT.jar')]);
  let learningProcess = launch('learning', 'java', ['-jar', path.join(root, 'services/aprendizaje-evaluacion/target/aprendizaje-evaluacion-0.1.0-SNAPSHOT.jar')]);
  await Promise.all([ready(api + '/api/health'), ready(sim + '/health/ready'), ready(learning + '/health/ready')]);
  console.log('All isolated services ready.');
  const testPassword = randomBytes(24).toString('hex');
  const hash = await bcrypt.hash(testPassword, 12);
  const managerId = 'manager-' + runId, leaderId = 'leader-' + runId;
  for (const [id, role] of [[managerId, 'GESTOR_PEDAGOGICO'], [leaderId, 'LIDER']]) {
    await backDb.query('INSERT INTO "User" (id,name,document,email,company,"passwordHash",role) VALUES ($1,$2,$3,$4,$5,$6,$7::"Role")',
      [id, 'Verification ' + role, randomBytes(12).toString('hex'), id + '@example.test', 'Verification', hash, role]);
  }
  const email = 'learner-' + runId + '@example.test';
  const user = await http('POST', '/api/auth/register', null, { name: 'Verification learner', document: randomBytes(12).toString('hex'), email, company: 'Verification', password: testPassword }, 201);
  await backDb.query('UPDATE "User" SET "leaderId"=$1 WHERE id=$2', [leaderId, user.id]);
  const learner = (await http('POST', '/api/auth/login', null, { email, password: testPassword })).token;
  const manager = (await http('POST', '/api/auth/login', null, { email: managerId + '@example.test', password: testPassword })).token;
  const leader = (await http('POST', '/api/auth/login', null, { email: leaderId + '@example.test', password: testPassword })).token;
  await check('authentication-and-role-restrictions', async () => {
    await http('GET', '/api/modules', null, undefined, 401);
    await http('POST', '/api/admin/modules', learner, {}, 403);
    await http('GET', '/api/reports/' + managerId, leader, undefined, 404);
  });
  const position = Number((await learnDb.query('SELECT COALESCE(MAX(position),0)+1 AS next FROM learning_modules')).rows[0].next);
  const moduleData = { title: 'Verificación UTF-8', description: 'Contenido íntegro', position, published: false };
  const module = await http('POST', '/api/admin/modules', manager, moduleData, 201);
  const lessonData = { moduleId: module.id, title: 'Lección uno', body: 'Introducción a inventarios', position: 1, minutes: 5, youtubeId: 'abcdefghijk' };
  const lesson1 = await http('POST', '/api/admin/lessons', manager, lessonData, 201);
  const lesson2 = await http('POST', '/api/admin/lessons', manager, { ...lessonData, title: 'Lección dos', position: 2 }, 201);
  const challenge = await http('POST', '/api/admin/challenges', manager, { lessonId: lesson1.id, question: '¿Cuánto es 2 + 2?', options: ['3', '4'], correctIndex: 1, explanation: 'La respuesta es cuatro.' }, 201);
  await check('draft-content-is-private-and-admin-contracts-match', async () => {
    assert(!(await http('GET', '/api/modules', learner)).some(m => m.id === module.id));
    const panel = await http('GET', '/api/admin', manager);
    const found = panel.modules.find(m => m.id === module.id); assert.equal(found.published, false);
    assert.equal(found.lessons.find(l => l.id === lesson1.id).challenges[0].correctIndex, 1);
  });
  await http('PUT', '/api/admin/modules/' + module.id, manager, { ...moduleData, published: true });
  await check('sequential-unlock-and-hidden-answers', async () => {
    const modules = await http('GET', '/api/modules', learner), found = modules.find(m => m.id === module.id);
    assert.equal(found.title, moduleData.title); assert.equal(found.lessons[0].unlocked, true);
    assert.equal(found.lessons[0].challenges[0].correctIndex, undefined); assert.equal(found.lessons[0].challenges[0].explanation, undefined);
    assert.equal(found.lessons[1].body, ''); assert.deepEqual(found.lessons[1].challenges, []);
    await http('GET', '/api/lessons/' + lesson2.id, learner, undefined, 403);
    await http('POST', '/api/lessons/' + lesson1.id + '/complete', learner, undefined, 400);
  });
  await check('attempts-feedback-and-best-score-xp', async () => {
    const wrong = await http('POST', '/api/challenges/' + challenge.id + '/attempts', learner, { answer: 0 }, 201);
    const right = await http('POST', '/api/challenges/' + challenge.id + '/attempts', learner, { answer: 1 }, 201);
    assert.equal(wrong.score, 0); assert.equal(wrong.attempt, 1); assert.equal(right.score, 100); assert.equal(right.attempt, 2);
    assert.equal(right.feedback, 'La respuesta es cuatro.');
    const p = await http('GET', '/api/progress', learner); assert.equal(p.xp, 20); assert.equal(p.topics.find(t => t.id === module.id).score, 50);
  });
  await check('completion-is-idempotent-and-next-lesson-unlocks', async () => {
    await http('POST', '/api/lessons/' + lesson1.id + '/complete', learner);
    await http('POST', '/api/lessons/' + lesson1.id + '/complete', learner);
    const next = await http('GET', '/api/lessons/' + lesson2.id, learner); assert.equal(next.unlocked, true);
    const p = await http('GET', '/api/progress', learner); assert.equal(p.xp, 70); assert.equal(p.completed, 1);
    const n = (await learnDb.query("SELECT count(*)::int AS n FROM learning_outbox WHERE user_id=$1 AND event_type='LeccionCompletada'", [user.id])).rows[0].n;
    assert.equal(n, 1);
  });
  await check('put-without-youtube-removes-video-and-position-conflict-is409', async () => {
    const { youtubeId, ...withoutVideo } = { ...lessonData, title: 'Lección dos', position: 2 };
    await http('PUT', '/api/admin/lessons/' + lesson2.id, manager, withoutVideo);
    assert.deepEqual((await http('GET', '/api/lessons/' + lesson2.id, learner)).contents, []);
    await http('POST', '/api/admin/modules', manager, { ...moduleData, published: true }, 409);
  });
  await http('POST', '/api/lessons/' + lesson2.id + '/complete', learner);
  const scenario = await http('POST', '/api/admin/scenarios', manager, { title: 'Simulation verification', description: 'Three days', initialStock: 10, demand: [5, 8, 4], leadTime: 2, unitCost: 2, salePrice: 5, holdingCost: 1, shortageCost: 3, orderCost: 4, maxOrder: 20, published: true }, 201);
  let run = await http('POST', '/api/simulations', learner, { scenarioId: scenario.id }, 201);
  for (const [day, quantity] of [[0, 6], [1, 0], [2, 0]]) run = await http('POST', `/api/simulations/${run.id}/decisions`, learner, { day, quantity });
  await check('simulation-summary-composes-learning-progress-and-leader-report', async () => {
    assert.equal(run.result.score, 86); assert.equal(run.result.profit, 18);
    const p = await http('GET', '/api/progress', learner); assert.equal(p.xp, 206); assert.equal(p.simulations, 1); assert.equal(p.passed, true);
    const report = await http('GET', '/api/reports/' + user.id, leader); assert.equal(report.progress.xp, 206); assert.equal(report.activities.length, 2);
    const team = await http('GET', '/api/reports', leader); assert.equal(team.find(u => u.id === user.id).progress.xp, 206);
  });
  let event;
  await check('real-outbox-to-java-inbox-and-duplicate-delivery', async () => {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const rows = (await learnDb.query('SELECT event_id FROM learning_simulation_inbox WHERE simulation_id=$1', [run.id])).rows;
      if (rows.length) break; await sleep(300);
    }
    const rows = (await simDb.query('SELECT event_id,payload,status FROM simulation_outbox WHERE aggregate_id=$1', [run.id])).rows;
    assert.equal(rows.length, 1); event = rows[0].payload;
    const inbox = (await learnDb.query('SELECT event_id FROM learning_simulation_inbox WHERE simulation_id=$1', [run.id])).rows;
    assert.equal(inbox.length, 1); assert.equal(inbox[0].event_id, rows[0].event_id);
    const send = body => fetch(api + '/internal/events', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-StockQuest-Event-Token': tokenEvents }, body: JSON.stringify(body) });
    assert.equal((await send(event)).status, 204);
    assert.equal((await send({ ...event, data: { ...event.data, score: 85 } })).status, 409);
    const achievements = (await learnDb.query("SELECT count(*)::int AS n FROM learning_achievements WHERE user_id=$1 AND key='PRIMERA_SIMULACION'", [user.id])).rows[0].n;
    assert.equal(achievements, 1);
  });
  await check('legacy-learning-has-no-writes-in-java-mode', async () => {
    for (const table of ['LearningProgress', 'ChallengeAttempt', 'UserAchievement', 'SimulationEventInbox']) {
      const n = (await backDb.query('SELECT count(*)::int AS n FROM "' + table + '" WHERE "userId"=$1', [user.id])).rows[0].n;
      assert.equal(n, 0, table + ' must not receive writes');
    }
  });
  await check('learning-outage-returns503-without-fallback', async () => {
    await stop(learningProcess); await http('GET', '/api/modules', learner, undefined, 503); await http('GET', '/api/progress', learner, undefined, 503);
  });
  learningProcess = launch('learning-restarted', 'java', ['-jar', path.join(root, 'services/aprendizaje-evaluacion/target/aprendizaje-evaluacion-0.1.0-SNAPSHOT.jar')]);
  // Exited handles are expected after the controlled outage; check this process directly on recovery.
  const recoveryDeadline = Date.now() + 45000;
  while (Date.now() < recoveryDeadline) {
    try { const r = await fetch(learning + '/health/ready', { signal: AbortSignal.timeout(1500) }); if (r.ok) break; } catch { /* startup */ }
    if (learningProcess.exitCode !== null) throw new Error('Learning restart failed.'); await sleep(300);
  }
  await check('restart-preserves-learning-and-simulation-progress', async () => {
    const p = await http('GET', '/api/progress', learner); assert.equal(p.xp, 206); assert.equal(p.simulations, 1); assert.equal(p.completed, 2);
    const facts = (await learnDb.query('SELECT aggregate_version FROM learning_outbox WHERE user_id=$1 ORDER BY aggregate_version', [user.id])).rows;
    assert.deepEqual(facts.map(f => Number(f.aggregate_version)), [1, 2, 3, 4]);
  });
  return { userId: user.id, simulationId: run.id };
}
let result;
main().then(ids => { result = { status: 'PASS', checks, ...ids }; }).catch(error => {
  result = { status: 'FAIL', checks, error: error.code ? 'PostgreSQL ' + error.code : error.message }; process.exitCode = 1;
}).finally(async () => {
  for (const child of children.reverse()) await stop(child);
  for (const client of clients) await client.end().catch(() => {});
  for (const stream of streams) stream.end();
  const report = { ...result, runId, databases: dbNames, ports: [14000, 14010, 14020], finishedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, reportPath: path.join(output, 'report.json') }, null, 2));
});
