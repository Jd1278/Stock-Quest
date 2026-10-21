/* Proves direct Java event delivery while the compatibility edge is unavailable. */
const {load,connect,login,request,control,origins}=require('./local-java.cjs');
const {randomUUID,randomBytes}=require('node:crypto');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const config=load(),runId=randomUUID(),checks=[],clients={};
let userId,scenarioId,simulationId,edgePaused=false,learningPaused=false;
const email='phase7-'+runId+'@example.test';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
 for(const key of ['people','learning','simulation'])clients[key]=await connect(config,key);
 const runtime=await control(config,'GET','/status');assert(runtime.ready);
 assert.equal(runtime.eventTarget,origins(config).learning+'/internal/events','Restart the local supervisor to load the direct event configuration.');
 const manager=(await login(config,config.accounts.manager)).token;
 const account={email,password:randomBytes(24).toString('hex')};
 userId=(await request(config,'POST','/api/auth/register',null,{...account,name:'Phase 7 verification',document:randomBytes(12).toString('hex'),company:'Verification'},201)).id;
 const token=(await login(config,account)).token;
 scenarioId=(await request(config,'POST','/api/admin/scenarios',manager,{title:'Phase 7 fixture '+runId,description:'Direct event delivery verification',initialStock:10,demand:[5,8,4],leadTime:2,unitCost:2,salePrice:5,holdingCost:1,shortageCost:3,orderCost:4,maxOrder:20,published:true},201)).id;
 let run=await request(config,'POST','/api/simulations',token,{scenarioId},201);simulationId=run.id;
 for(const [day,quantity] of [[0,6],[1,0]])run=await request(config,'POST',`/api/simulations/${run.id}/decisions`,token,{day,quantity});
 await control(config,'POST','/pause/edge');edgePaused=true;
 let unavailable=false;try{await fetch(origins(config).edge+'/api/health',{signal:AbortSignal.timeout(1000)});}catch{unavailable=true;}
 assert(unavailable);checks.push('compatibility-edge-confirmed-unavailable');
 try {
  run=await request(config,'POST',`/api/simulations/${run.id}/decisions`,token,{day:2,quantity:0},200,'simulation');
  assert.equal(run.result.score,86);assert.equal(run.result.profit,18);
  const deadline=Date.now()+45000;let delivered=false;
  while(Date.now()<deadline){
   const source=(await clients.simulation.query('SELECT status FROM simulation_outbox WHERE aggregate_id=$1',[run.id])).rows[0];
   const target=(await clients.learning.query('SELECT count(*)::int AS n FROM learning_simulation_inbox WHERE simulation_id=$1 AND user_id=$2',[run.id,userId])).rows[0];
   if(source?.status==='DELIVERED'&&target.n===1){delivered=true;break;}await pause(400);
  }
  assert(delivered,'Java event did not arrive while edge was stopped');checks.push('simulation-to-learning-delivered-without-express');
  const payload=(await clients.simulation.query('SELECT payload FROM simulation_outbox WHERE aggregate_id=$1',[run.id])).rows[0].payload;
  for(let i=0;i<2;i++){
   const response=await fetch(origins(config).learning+'/internal/events',{method:'POST',headers:{'Content-Type':'application/json','X-StockQuest-Event-Token':config.eventToken},body:JSON.stringify(payload),signal:AbortSignal.timeout(5000)});
   assert.equal(response.status,204);
  }
  assert.equal((await clients.learning.query('SELECT count(*)::int AS n FROM learning_simulation_inbox WHERE simulation_id=$1',[run.id])).rows[0].n,1);
  checks.push('direct-replays-keep-one-inbox-entry');
 }finally{await control(config,'POST','/restart/edge');edgePaused=false;}
 const progress=await request(config,'GET','/api/progress',token);assert.equal(progress.xp,86);assert.equal(progress.simulations,1);
 assert.equal((await request(config,'GET','/api/simulations/'+run.id,token)).result.id,run.result.id);
 checks.push('edge-recovered-and-progress-result-consistent');
}
let result;
main().then(()=>{result={status:'PASS'};}).catch(e=>{result={status:'FAIL',error:e.code?'PostgreSQL '+e.code:e.message};process.exitCode=1;})
 .finally(async()=>{
  try{
   if(edgePaused)await control(config,'POST','/restart/edge');
   if(userId&&clients.learning){await control(config,'POST','/pause/learning');learningPaused=true;}
   if(simulationId&&clients.simulation){
    await clients.simulation.query('DELETE FROM simulation_outbox_deliveries WHERE event_id IN (SELECT event_id FROM simulation_outbox WHERE aggregate_id=$1)',[simulationId]);
    await clients.simulation.query('DELETE FROM simulation_outbox WHERE aggregate_id=$1',[simulationId]);
    await clients.simulation.query('DELETE FROM simulation_results WHERE simulation_id=$1',[simulationId]);
    await clients.simulation.query('DELETE FROM simulation_runs WHERE id=$1 AND scenario_id=$2 AND user_id=$3',[simulationId,scenarioId,userId]);
   }
   if(scenarioId&&clients.simulation)await clients.simulation.query('DELETE FROM simulation_scenarios WHERE id=$1',[scenarioId]);
   if(userId&&clients.learning){
    for (const table of ["learning_progress_outbox", "learning_progress_snapshots", "learning_progress_refresh_queue", "learning_outbox", "learning_versions"]) await clients.learning.query("DELETE FROM "+table+" WHERE user_id=$1",[userId]);
    await clients.learning.query('DELETE FROM learning_simulation_inbox WHERE simulation_id=$1 AND user_id=$2',[simulationId,userId]);
    await clients.learning.query('DELETE FROM learning_achievements WHERE user_id=$1',[userId]);
   }
   if(userId&&clients.people)await clients.people.query('DELETE FROM people_users WHERE id=$1 AND email=$2',[userId,email]);
  }catch(e){result={status:'FAIL',error:'Recovery/fixture cleanup failed: '+(e.code||e.message)};process.exitCode=1;}
  finally{
   if(learningPaused)try{await control(config,'POST','/restart/learning');learningPaused=false;}catch{result={status:'FAIL',error:'Learning recovery failed'};process.exitCode=1;}
   await Promise.all(Object.values(clients).map(c=>c.end()));
  }
  const report={...result,runId,checks,finishedAt:new Date().toISOString(),scope:'New UUID fixtures only; existing learner progress and scenarios preserved.'};
  fs.writeFileSync(path.resolve(__dirname,'../.stockquest-local/phase7-runtime.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 });
