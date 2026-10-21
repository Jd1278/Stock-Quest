/* Real all-Java integration. Only this run's UUID fixtures and their derived data are cleaned up. */
const {load,connect,login,request,control,origins}=require('./local-java.cjs');
const {randomUUID,randomBytes}=require('node:crypto');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const config=load(),origin=origins(config),runId=randomUUID(),checks=[],clients={};
const email='ag05-'+runId+'@example.test';
let userId,scenarioId,simulationId,learningPaused=false,peoplePaused=false;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function eventually(action){const end=Date.now()+45000;while(Date.now()<end){if(await action())return;await delay(400);}throw new Error('Projection did not converge before timeout.');}
async function internal(service,route,body,expected=200,token) {
 const result=await fetch(origin[service]+route,{method:'POST',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json','X-StockQuest-Service-Token':token??(service==='people'?config.progressToken:config.learningToken)},body:JSON.stringify(body)});
 assert.equal(result.status,expected,service+' '+route);return expected===204?null:result.json();
}
async function main(){
 const state=await control(config,'GET','/status');assert(state.ready);assert.equal(state.reportsMode,'projection');assert(state.progressEventsEnabled);
 for(const key of ['people','learning','simulation'])clients[key]=await connect(config,key);
 const leader=(await login(config,config.accounts.leader)).token,manager=(await login(config,config.accounts.manager)).token;
 const account={email,password:randomBytes(24).toString('hex')};
 userId=(await request(config,'POST','/api/users',leader,{...account,name:'AG05 verification',document:randomBytes(12).toString('hex'),company:'Verification'},201)).id;
 const learner=(await login(config,account)).token;
 await internal('people','/internal/progress-projections/rebuild',{userIds:[userId]},204);
 let initial=(await internal('learning','/internal/progress-snapshots/query',{userIds:[userId]})).snapshots[0];
 const before=await request(config,'GET','/api/reports/'+userId,leader);assert.equal(before.progress.xp,0);
 const panel=await request(config,'GET','/api/admin',manager);
 const first=(await request(config,'GET','/api/modules',learner))[0].lessons[0];
 const adminLesson=panel.modules.flatMap(m=>m.lessons).find(l=>l.id===first.id);assert(adminLesson);
 for(const challenge of adminLesson.challenges)await request(config,'POST','/api/challenges/'+challenge.id+'/attempts',learner,{answer:challenge.correctIndex},201);
 await request(config,'POST','/api/lessons/'+first.id+'/complete',learner);
 const expected=await request(config,'GET','/api/progress',learner);
 await eventually(async()=>{const r=await request(config,'GET','/api/reports/'+userId,leader);return r.progress.xp===expected.xp&&r.progress.completed===expected.completed;});
 assert.equal(expected.completed,1);checks.push('challenge-and-lesson-facts-projected-to-authorized-leader-report');
 const current=(await internal('learning','/internal/progress-snapshots/query',{userIds:[userId]})).snapshots[0];assert(current.aggregateVersion>initial.aggregateVersion);
 await Promise.all([internal('people','/internal/progress-events',current,204),internal('people','/internal/progress-events',current,204)]);
 await internal('people','/internal/progress-events',initial,204);
 const conflicting=structuredClone(current);conflicting.data.progress.xp+=1;await internal('people','/internal/progress-events',conflicting,409);
 assert.equal((await request(config,'GET','/api/reports/'+userId,leader)).progress.xp,expected.xp);
 assert.equal((await clients.people.query('SELECT count(*)::int AS n FROM people_progress_inbox WHERE event_id=$1',[current.eventId])).rows[0].n,1);
 checks.push('concurrent-duplicates-old-versions-and-conflicting-content-preserve-projection');
 await internal('people','/internal/progress-events',current,401,'invalid');
 await request(config,'GET','/api/reports/'+userId,learner,undefined,403);
 checks.push('internal-service-auth-and-public-report-permissions');
 await control(config,'POST','/pause/learning');learningPaused=true;
 try {
  const cached=await request(config,'GET','/api/reports/'+userId,leader);assert.equal(cached.progress.xp,expected.xp);
  await request(config,'GET','/api/progress',learner,undefined,503);
  checks.push('projected-report-readable-while-learning-is-down');
 }finally{await control(config,'POST','/restart/learning');learningPaused=false;}
 scenarioId=(await request(config,'POST','/api/admin/scenarios',manager,{title:'AG05 fixture '+runId,description:'Projection verification',initialStock:10,demand:[5,8,4],leadTime:2,unitCost:2,salePrice:5,holdingCost:1,shortageCost:3,orderCost:4,maxOrder:20,published:true},201)).id;
 let run=await request(config,'POST','/api/simulations',learner,{scenarioId},201);simulationId=run.id;
 for(const [day,quantity]of [[0,6],[1,0],[2,0]])run=await request(config,'POST',`/api/simulations/${simulationId}/decisions`,learner,{day,quantity});
 assert.equal(run.result.score,86);
 await eventually(async()=>{const r=await request(config,'GET','/api/reports/'+userId,leader);return r.progress.simulations===1&&r.progress.xp===expected.xp+86&&r.progress.achievements.some(a=>a.key==='PRIMERA_SIMULACION');});
 checks.push('simulation-to-learning-to-people-chain-updates-xp-and-one-achievement');
 const latest=(await internal('learning','/internal/progress-snapshots/query',{userIds:[userId]})).snapshots[0];
 await control(config,'POST','/pause/people');peoplePaused=true;
 try {
  await internal('learning','/internal/progress-snapshots/replay',{userIds:[userId]});
  await eventually(async()=>{const r=(await clients.learning.query('SELECT attempts,status FROM learning_progress_outbox WHERE event_id=$1',[latest.eventId])).rows[0];return r.attempts>=1&&r.status==='PENDING';});
  await control(config,'POST','/pause/learning');learningPaused=true;
  await control(config,'POST','/restart/people');peoplePaused=false;
  await control(config,'POST','/restart/learning');learningPaused=false;
  await eventually(async()=>(await clients.learning.query('SELECT status FROM learning_progress_outbox WHERE event_id=$1',[latest.eventId])).rows[0].status==='DELIVERED');
  checks.push('outbox-survives-source-restart-and-target-outage-then-redelivers');
 }finally{
  if(peoplePaused){await control(config,'POST','/restart/people');peoplePaused=false;}
  if(learningPaused){await control(config,'POST','/restart/learning');learningPaused=false;}
 }
 await clients.people.query('DELETE FROM people_progress_projections WHERE user_id=$1',[userId]);
 await internal('people','/internal/progress-projections/rebuild',{userIds:[userId]},204);
 const rebuilt=await request(config,'GET','/api/reports/'+userId,leader);
 assert.equal(rebuilt.progress.xp,expected.xp+86);assert.equal(rebuilt.progress.completed,1);assert.equal(rebuilt.progress.simulations,1);
 assert.equal((await clients.people.query('SELECT count(*)::int AS n FROM people_progress_inbox WHERE event_id=$1',[latest.eventId])).rows[0].n,1);
 checks.push('snapshot-rebuild-restores-derived-row-without-duplicating-inbox');
 await internal('learning','/internal/progress-snapshots/query',{userIds:[userId]},401,'invalid');
 checks.push('snapshot-and-replay-endpoints-are-not-public');
}
let result;
main().then(()=>{result={status:'PASS'};}).catch(e=>{result={status:'FAIL',error:e.code||e.message};process.exitCode=1;})
.finally(async()=>{
 try {
  if(peoplePaused){await control(config,'POST','/restart/people');peoplePaused=false;}
  if(userId&&clients.learning){
   if(!learningPaused){await control(config,'POST','/pause/learning');learningPaused=true;}
   for(const table of ['learning_progress_outbox','learning_progress_snapshots','learning_progress_refresh_queue','learning_outbox','learning_versions','learning_simulation_inbox','learning_achievements','learning_progress','learning_attempts'])await clients.learning.query(`DELETE FROM ${table} WHERE user_id=$1`,[userId]);
  }
  if(simulationId&&clients.simulation){
   await clients.simulation.query('DELETE FROM simulation_outbox_deliveries WHERE event_id IN (SELECT event_id FROM simulation_outbox WHERE aggregate_id=$1)',[simulationId]);
   await clients.simulation.query('DELETE FROM simulation_outbox WHERE aggregate_id=$1',[simulationId]);
   await clients.simulation.query('DELETE FROM simulation_results WHERE simulation_id=$1',[simulationId]);
   await clients.simulation.query('DELETE FROM simulation_runs WHERE id=$1 AND user_id=$2',[simulationId,userId]);
  }
  if(scenarioId&&clients.simulation)await clients.simulation.query('DELETE FROM simulation_scenarios WHERE id=$1',[scenarioId]);
  if(userId&&clients.people)await clients.people.query('DELETE FROM people_users WHERE id=$1 AND email=$2',[userId,email]);
 }catch(e){result={status:'FAIL',error:'Fixture cleanup failed: '+(e.code||e.message)};process.exitCode=1;}
 finally{
  if(learningPaused)try{await control(config,'POST','/restart/learning');learningPaused=false;}catch{result={status:'FAIL',error:'Learning recovery failed'};process.exitCode=1;}
  await Promise.all(Object.values(clients).map(c=>c.end()));
 }
 const report={...result,runId,checks,finishedAt:new Date().toISOString(),existingUserProgressPreserved:true};
 fs.writeFileSync(path.resolve(__dirname,'../.stockquest-local/ag05-20261021/integration.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
});
