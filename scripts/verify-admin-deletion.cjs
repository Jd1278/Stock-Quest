/* Exercise the running phase-6 stack; SQL cleanup is limited to newly created fixture IDs. */
const { load, connect, login, request } = require('./local-java.cjs');
const { randomUUID, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const config = load(), runId = randomUUID(), checks = [];
const fixtureUser = 'deletion-' + runId;
const clients = {};
let moduleId, lessonId, challengeId, attemptId, scenarioId, userId, simulationId;
async function main() {
  for (const key of ['people', 'learning', 'simulation']) clients[key] = await connect(config, key);
  const manager = (await login(config, config.accounts.manager)).token;
  const account = { name: 'Deletion verification', document: randomBytes(12).toString('hex'), email: fixtureUser + '@example.test', company: 'Verification', password: randomBytes(24).toString('hex') };
  userId = (await request(config, 'POST', '/api/auth/register', null, account, 201)).id;
  const learner = (await login(config, account)).token;
  const panel = await request(config, 'GET', '/api/admin', manager);
  const position = Math.max(0, ...panel.modules.map(m => m.position)) + 1;
  moduleId = (await request(config, 'POST', '/api/admin/modules', manager, { title: 'Deletion fixture ' + runId, description: 'Temporary verification', position, published: false }, 201)).id;
  lessonId = (await request(config, 'POST', '/api/admin/lessons', manager, { moduleId, title: 'Deletion fixture', body: 'Temporary', position: 1, minutes: 5, youtubeId: 'abcdefghijk' }, 201)).id;
  challengeId = (await request(config, 'POST', '/api/admin/challenges', manager, { lessonId, question: 'Fixture?', options: ['A', 'B'], correctIndex: 0, explanation: 'A' }, 201)).id;
  await request(config, 'DELETE', '/api/admin/modules/' + moduleId, null, undefined, 401);
  await request(config, 'DELETE', '/api/admin/modules/' + moduleId, learner, undefined, 403);
  checks.push('module-delete-authentication-and-manager-role');
  for (const [kind,id] of [['lessons',lessonId],['challenges',challengeId]]) {
    await request(config,'DELETE',`/api/admin/${kind}/${id}`,null,undefined,401);
    await request(config,'DELETE',`/api/admin/${kind}/${id}`,learner,undefined,403);
  }
  checks.push('lesson-and-challenge-deletion-require-manager');
  await clients.learning.query('INSERT INTO learning_progress VALUES ($1,$2,NOW())', [fixtureUser, lessonId]);
  await request(config, 'DELETE', '/api/admin/modules/' + moduleId, manager, undefined, 409, 'web');
  await request(config, 'DELETE', '/api/admin/lessons/' + lessonId, manager, undefined, 409, 'web');
  assert.equal((await clients.learning.query('SELECT count(*)::int AS n FROM learning_challenges WHERE id=$1', [challengeId])).rows[0].n, 1);
  await clients.learning.query('DELETE FROM learning_progress WHERE user_id=$1 AND lesson_id=$2', [fixtureUser, lessonId]);
  attemptId = randomUUID();
  await clients.learning.query('INSERT INTO learning_attempts VALUES ($1,$2,$3,0,100,NOW())', [attemptId, fixtureUser, challengeId]);
  await request(config, 'DELETE', '/api/admin/modules/' + moduleId, manager, undefined, 409);
  await request(config, 'DELETE', '/api/admin/lessons/' + lessonId, manager, undefined, 409);
  await request(config, 'DELETE', '/api/admin/challenges/' + challengeId, manager, undefined, 409);
  await clients.learning.query('DELETE FROM learning_attempts WHERE id=$1 AND user_id=$2', [attemptId, fixtureUser]);
  checks.push('module-progress-and-attempt-conflicts-preserve-content');
  checks.push('lesson-progress-and-challenge-attempt-conflicts-preserve-history');
  await request(config,'DELETE','/api/admin/challenges/'+challengeId,manager,undefined,204,'web');
  await request(config,'DELETE','/api/admin/challenges/'+challengeId,manager,undefined,404);
  assert.equal((await clients.learning.query('SELECT count(*)::int AS n FROM learning_lessons WHERE id=$1',[lessonId])).rows[0].n,1);
  checks.push('unused-challenge-deletion-preserves-lesson-and-module');
  challengeId=(await request(config,'POST','/api/admin/challenges',manager,{lessonId,question:'Fixture?',options:['A','B'],correctIndex:0,explanation:'A'},201)).id;
  await request(config,'DELETE','/api/admin/lessons/'+lessonId,manager,undefined,204,'web');
  await request(config,'DELETE','/api/admin/lessons/'+lessonId,manager,undefined,404);
  assert.equal((await clients.learning.query('SELECT count(*)::int AS n FROM learning_modules WHERE id=$1',[moduleId])).rows[0].n,1);
  assert.equal((await clients.learning.query('SELECT count(*)::int AS n FROM learning_challenges WHERE id=$1',[challengeId])).rows[0].n,0);
  checks.push('unused-lesson-deletion-removes-child-content-and-preserves-module');
  lessonId=(await request(config,'POST','/api/admin/lessons',manager,{moduleId,title:'Deletion fixture',body:'Temporary',position:1,minutes:5,youtubeId:'abcdefghijk'},201)).id;
  challengeId=(await request(config,'POST','/api/admin/challenges',manager,{lessonId,question:'Fixture?',options:['A','B'],correctIndex:0,explanation:'A'},201)).id;
  await request(config, 'DELETE', '/api/admin/modules/' + moduleId, manager, undefined, 204, 'web');
  await request(config, 'DELETE', '/api/admin/modules/' + moduleId, manager, undefined, 404);
  checks.push('unused-module-and-child-content-delete-204-then404');

  const { id: _id, ...parameters } = require('../content/stockquest.json').scenarios[0];
  scenarioId = (await request(config, 'POST', '/api/admin/scenarios', manager, { ...parameters, title: 'Deletion fixture ' + runId }, 201)).id;
  await request(config, 'DELETE', '/api/admin/scenarios/' + scenarioId, learner, undefined, 403);
  simulationId = (await request(config, 'POST', '/api/simulations', learner, { scenarioId }, 201)).id;
  await request(config, 'DELETE', '/api/admin/scenarios/' + scenarioId, manager, undefined, 409);
  assert.equal((await request(config, 'GET', '/api/simulations/' + simulationId, learner)).id, simulationId);
  checks.push('scenario-with-game-is-protected-and-game-remains-readable');
  await clients.simulation.query('DELETE FROM simulation_runs WHERE id=$1 AND scenario_id=$2 AND user_id=$3', [simulationId, scenarioId, userId]);
  await request(config, 'DELETE', '/api/admin/scenarios/' + scenarioId, manager, undefined, 204, 'web');
  await request(config, 'DELETE', '/api/admin/scenarios/' + scenarioId, manager, undefined, 404);
  checks.push('unused-scenario-delete-204-then404');
  const after = await request(config, 'GET', '/api/admin', manager);
  assert.equal(after.modules.length, panel.modules.length);assert.equal(after.scenarios.length, panel.scenarios.length);
  checks.push('catalog-counts-restored-and-existing-records-preserved');
}
let result;
main().then(() => { result = { status: 'PASS' }; }).catch(e => { result = { status: 'FAIL', error: e.code ? 'PostgreSQL ' + e.code : e.message }; process.exitCode = 1; })
  .finally(async () => {
    try {
      if (lessonId && clients.learning) {
        await clients.learning.query('DELETE FROM learning_attempts WHERE user_id=$1 AND challenge_id=$2', [fixtureUser, challengeId]);
        await clients.learning.query('DELETE FROM learning_progress WHERE user_id=$1 AND lesson_id=$2', [fixtureUser, lessonId]);
        await clients.learning.query('DELETE FROM learning_challenges WHERE lesson_id=$1', [lessonId]);
        await clients.learning.query('DELETE FROM learning_lessons WHERE id=$1 AND module_id=$2', [lessonId, moduleId]);
      }
      if (moduleId && clients.learning) await clients.learning.query('DELETE FROM learning_modules WHERE id=$1', [moduleId]);
      if (simulationId && clients.simulation) await clients.simulation.query('DELETE FROM simulation_runs WHERE id=$1 AND scenario_id=$2 AND user_id=$3', [simulationId, scenarioId, userId]);
      if (scenarioId && clients.simulation) await clients.simulation.query('DELETE FROM simulation_scenarios WHERE id=$1', [scenarioId]);
      if (userId && clients.people) await clients.people.query('DELETE FROM people_users WHERE id=$1 AND email=$2', [userId, fixtureUser + '@example.test']);
    } catch (e) { result = { status: 'FAIL', error: 'Fixture cleanup failed: ' + (e.code || 'unknown') };process.exitCode = 1; }
    finally { await Promise.all(Object.values(clients).map(c => c.end())); }
    const report = { ...result, runId, checks, finishedAt: new Date().toISOString(), fixtureCleanup: 'Only IDs created in this run' };
    fs.writeFileSync(path.resolve(__dirname, '../.stockquest-local/admin-deletion-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  });
