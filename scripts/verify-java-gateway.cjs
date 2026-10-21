/* An ephemeral gateway targets the existing Java services. Never changes the live edge or its configuration. */
const { load, origins, login, request, connect, control } = require('./local-java.cjs');
const { createApp } = require('../gateway/dist/app');
const { readConfig } = require('../gateway/dist/Infrastructure/config');
const { HttpServices } = require('../gateway/dist/Infrastructure/HttpServices');
const { randomUUID, randomBytes } = require('node:crypto');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const runId = randomUUID(), config = load(), origin = origins(config), checks = [], clients = {};
let server, userId, scenarioId, simulationId, learningPaused = false;
const email = 'gateway-' + runId + '@example.test';
async function main() {
  const settings = readConfig({ PEOPLE_SERVICE_URL: origin.people, LEARNING_SERVICE_URL: origin.learning,
    SIMULATION_SERVICE_URL: origin.simulation, LEARNING_SERVICE_TOKEN: config.learningToken, SIMULATION_SERVICE_TOKEN: config.simulationToken });
  const app = createApp(settings, new HttpServices(settings));
  server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  const target = { ...config, ports: { ...config.ports, edge: server.address().port } };
  for (const role of ['learner', 'leader', 'manager']) {
    const token = (await login(target, config.accounts[role])).token;
    const profile = await request(target, 'GET', '/api/auth/me', token);
    assert.equal(profile.id, config.accounts[role].id);
    const routes = role === 'learner' ? ['/api/modules', '/api/progress', '/api/simulations/scenarios', '/api/simulations']
      : role === 'leader' ? ['/api/reports', '/api/groups'] : ['/api/admin'];
    for (const route of routes) {
      const actual = await request(target, 'GET', route, token);
      const baseline = await request(config, 'GET', route, token);
      assert.deepEqual(actual, baseline, 'Compatibility mismatch: ' + route);
      checks.push(role + ':same-response:' + route);
    }
    if (role === 'learner') {
      await request(target, 'GET', '/api/admin', token, undefined, 403);
      await request(target, 'GET', '/api/groups', token, undefined, 403);
      checks.push('learner-admin-and-groups-forbidden');
    }
  }
  // Only disposable UUID fixtures are written. Cleanup uses their exact identifiers.
  for (const key of ['people', 'learning', 'simulation']) clients[key] = await connect(config, key);
  const manager = (await login(target, config.accounts.manager)).token;
  const account = { email, password: randomBytes(24).toString('hex') };
  userId = (await request(target, 'POST', '/api/auth/register', null, { ...account, name: 'Gateway verification', document: randomBytes(12).toString('hex'), company: 'Verification' }, 201)).id;
  const token = (await login(target, account)).token;
  scenarioId = (await request(target, 'POST', '/api/admin/scenarios', manager, { title: 'Gateway fixture ' + runId, description: 'Gateway migration verification', initialStock: 10,
    demand: [5, 8, 4], leadTime: 2, unitCost: 2, salePrice: 5, holdingCost: 1, shortageCost: 3, orderCost: 4, maxOrder: 20, published: true }, 201)).id;
  let run = await request(target, 'POST', '/api/simulations', token, { scenarioId }, 201); simulationId = run.id;
  for (const [day, quantity] of [[0, 6], [1, 0], [2, 0]]) run = await request(target, 'POST', `/api/simulations/${simulationId}/decisions`, token, { day, quantity });
  assert(run.finished); assert.equal(run.result.score, 86); assert.equal(run.result.profit, 18);
  const restored = await request(target, 'GET', '/api/simulations/' + simulationId, token);
  // PostgreSQL stores microseconds; the immediate Java response can include nanoseconds.
  assert(Math.abs(Date.parse(restored.result.createdAt) - Date.parse(run.result.createdAt)) <= 1);
  assert.deepEqual({ ...restored, result: { ...restored.result, createdAt: undefined } }, { ...run, result: { ...run.result, createdAt: undefined } });
  await request(target, 'POST', `/api/simulations/${simulationId}/decisions`, token, { day: 3, quantity: 0 }, 409);
  checks.push('registration-login-scenario-and-three-days-score86-profit18-persistence-and409');
  const deadline = Date.now() + 45000;
  let progress;
  while (Date.now() < deadline) {
    progress = await request(target, 'GET', '/api/progress', token);
    const received = await clients.learning.query('SELECT count(*)::int AS n FROM learning_simulation_inbox WHERE simulation_id=$1 AND user_id=$2', [simulationId, userId]);
    if (progress.xp === 86 && progress.simulations === 1 && received.rows[0].n === 1 && progress.achievements.some(a => a.key === 'PRIMERA_SIMULACION')) break;
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  assert.equal(progress.xp, 86); assert.equal(progress.simulations, 1);
  assert.equal(progress.achievements.filter(a => a.key === 'PRIMERA_SIMULACION').length, 1);
  const inbox = await clients.learning.query('SELECT count(*)::int AS n FROM learning_simulation_inbox WHERE simulation_id=$1 AND user_id=$2', [simulationId, userId]);
  assert.equal(inbox.rows[0].n, 1);
  checks.push('direct-java-event-one-inbox-one-achievement-and-progress');
  await request(target, 'POST', '/api/auth/logout', token, undefined, 204);
  await request(target, 'GET', '/api/progress', token, undefined, 401);
  checks.push('logout-revokes-session');
}
let report;
main().then(() => { report = { status: 'PASS' }; }).catch(error => {
  report = { status: 'FAIL', error: error.message }; process.exitCode = 1;
}).finally(async () => {
  try {
    if (userId && clients.learning) { await control(config, 'POST', '/pause/learning'); learningPaused = true; }
    if (simulationId && clients.simulation) {
      await clients.simulation.query('DELETE FROM simulation_outbox_deliveries WHERE event_id IN (SELECT event_id FROM simulation_outbox WHERE aggregate_id=$1)', [simulationId]);
      await clients.simulation.query('DELETE FROM simulation_outbox WHERE aggregate_id=$1', [simulationId]);
      await clients.simulation.query('DELETE FROM simulation_results WHERE simulation_id=$1', [simulationId]);
      await clients.simulation.query('DELETE FROM simulation_runs WHERE id=$1 AND scenario_id=$2 AND user_id=$3', [simulationId, scenarioId, userId]);
    }
    if (scenarioId && clients.simulation) await clients.simulation.query('DELETE FROM simulation_scenarios WHERE id=$1', [scenarioId]);
    if (userId && clients.learning) {
    for (const table of ["learning_progress_outbox", "learning_progress_snapshots", "learning_progress_refresh_queue", "learning_outbox", "learning_versions"]) await clients.learning.query("DELETE FROM "+table+" WHERE user_id=$1",[userId]);
      await clients.learning.query('DELETE FROM learning_simulation_inbox WHERE simulation_id=$1 AND user_id=$2', [simulationId, userId]);
      await clients.learning.query('DELETE FROM learning_achievements WHERE user_id=$1', [userId]);
    }
    if (userId && clients.people) await clients.people.query('DELETE FROM people_users WHERE id=$1 AND email=$2', [userId, email]);
  } catch (error) { report = { status: 'FAIL', error: 'Fixture cleanup failed: ' + (error.code || error.message) }; process.exitCode = 1; }
  finally {
    if (learningPaused) try { await control(config, 'POST', '/restart/learning'); learningPaused = false; }
    catch { report = { status: 'FAIL', error: 'Learning recovery failed' }; process.exitCode = 1; }
    await Promise.all(Object.values(clients).map(client => client.end()));
    if (server) await new Promise(resolve => server.close(resolve));
  }
  report = { ...report, runId, checks, finishedAt: new Date().toISOString(), liveEdgeRestarted: false, existingDataPreserved: true };
  const directory = path.resolve(__dirname, '../.stockquest-local'); fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'java-gateway-verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
});
