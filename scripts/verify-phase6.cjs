/* Integration checks use only the explicitly prepared local phase-6 environment. */
const {load,save,connect,request,login,control,origins}=require('./local-java.cjs');
const {randomUUID,randomBytes}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const content=require('../content/stockquest.json');
const config=load(),checks=[],measurements=[],sample={topics:content.lessons.length};
const runId=randomUUID(),directory=path.resolve(__dirname,'../.stockquest-local/verification',runId);
fs.mkdirSync(directory,{recursive:true});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function check(name,action){await action();checks.push(name);console.log('PASS '+name);}
async function sql(key,fn){const c=await connect(config,key);try{return await fn(c);}finally{await c.end();}}
async function waitFor(action){const until=Date.now()+60000;while(Date.now()<until){if(await action())return;await pause(400);}throw new Error('Asynchronous delivery did not converge.');}
async function measure(name,concurrency,count,action){
 const times=[],failures=[];let index=0;
 await Promise.all(Array.from({length:concurrency},async()=>{while(index<count){index++;const begin=performance.now();try{await action();times.push(performance.now()-begin);}catch(e){failures.push(e.message);}}}));
 times.sort((a,b)=>a-b);
 const row={name,concurrency,requests:count,success:times.length,failures:failures.length,p50Ms:Math.round(times[Math.max(0,Math.ceil(times.length*.50)-1)]||0),p95Ms:Math.round(times[Math.max(0,Math.ceil(times.length*.95)-1)]||0),maxMs:Math.round(times.at(-1)||0)};
 measurements.push(row);assert.equal(failures.length,0,failures[0]);assert(row.maxMs<3000,name+' exceeded 3 seconds in this local sample');
}
async function main(){
 const status=await control(config,'GET','/status');assert(status.ready);
 const manager=(await login(config,config.accounts.manager)).token,leader=(await login(config,config.accounts.leader)).token;
 const account={email:'integration-'+runId+'@example.test',password:randomBytes(24).toString('hex')};
 const learner=await request(config,'POST','/api/users',leader,{name:'Aprendiz integración fase 6',document:randomBytes(12).toString('hex'),email:account.email,password:account.password,company:'Stock Quest'},201);
 let token=(await login(config,account)).token;
 config.lastVerification={...account,id:learner.id};save(config);
 const panel=await request(config,'GET','/api/admin',manager);
 await check('nine-original-topics-lessons-challenges-and-two-product-scenarios',async()=>{
  assert.equal(panel.modules.length,9);assert.equal(panel.scenarios.filter(s=>s.published).length,2);
  for(const [i,item]of content.lessons.entries()){
   const m=panel.modules.find(m=>m.position===i+1);assert.equal(m.title,item.title);assert.equal(m.description,item.description);assert.equal(m.lessons.length,1);
   const l=m.lessons[0];assert.equal(l.body,item.body);assert.equal(l.title,item.lesson);assert.equal(l.challenges.length,1);
   assert.equal(l.challenges[0].question,item.question);assert.deepEqual(l.challenges[0].options,item.options);assert.equal(l.challenges[0].correctIndex,item.correct);
  }
  const route=await request(config,'GET','/api/modules',token);assert.equal(route.length,9);assert.equal(route[0].lessons[0].unlocked,true);assert.equal(route[1].lessons[0].unlocked,false);
  assert(!JSON.stringify(route).includes('correctIndex'));
 });
 await check('sequential-learning-all-nine-topics-and-idempotent-completion',async()=>{
  await request(config,'GET','/api/lessons/'+panel.modules[1].lessons[0].id,token,undefined,403);
  for(const [i,m]of panel.modules.entries()){
   const lesson=m.lessons[0],challenge=lesson.challenges[0];
   const current=await request(config,'GET','/api/lessons/'+lesson.id,token);assert.equal(current.unlocked,true);
   if(i===0){const wrong=await request(config,'POST','/api/challenges/'+challenge.id+'/attempts',token,{answer:(content.lessons[i].correct+1)%content.lessons[i].options.length},201);assert.equal(wrong.passed,false);}
   const result=await request(config,'POST','/api/challenges/'+challenge.id+'/attempts',token,{answer:content.lessons[i].correct},201);assert.equal(result.score,100);
   await request(config,'POST','/api/lessons/'+lesson.id+'/complete',token);
  }
  await request(config,'POST','/api/lessons/'+panel.modules[0].lessons[0].id+'/complete',token);
  const progress=await request(config,'GET','/api/progress',token);assert.equal(progress.completed,9);assert.equal(progress.percent,100);assert.equal(progress.xp,630);assert.equal(progress.passed,false);
 });
 let group;
 await check('groups-and-authorized-team-reports-through-the-frontend-proxy',async()=>{
  group=await request(config,'POST','/api/groups',leader,{name:'  Grupo fase 6  '},201);
  await request(config,'POST',`/api/groups/${group.id}/members`,leader,{userId:learner.id});
  await request(config,'POST',`/api/groups/${group.id}/members`,leader,{userId:learner.id});
  const rows=await request(config,'GET','/api/groups',leader,undefined,200,'web');
  const found=rows.find(g=>g.id===group.id);assert.equal(found.name,'Grupo fase 6');assert.equal(found.members.length,1);
  await request(config,'GET','/api/groups',token,undefined,403);
  await request(config,'GET','/api/admin',token,undefined,403);
  await request(config,'GET','/api/reports/'+config.accounts.manager.id,leader,undefined,404);
 });
 let run;
 await check('simulation-with-product-data-concurrency-and-finalization',async()=>{
  const scenario=panel.scenarios.find(s=>s.title===content.scenarios[0].title);
  run=await request(config,'POST','/api/simulations',token,{scenarioId:scenario.id},201);
  // Requests for one day race: exactly one succeeds; the other sees the changed version/day.
  const route=`/api/simulations/${run.id}/decisions`;
  const responses=await Promise.all([0,1].map(()=>fetch(origins(config).edge+route,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({day:0,quantity:30}),signal:AbortSignal.timeout(10000)})));
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);run=await responses.find(r=>r.status===200).json();
  while(run.day<run.days-1)run=await request(config,'POST',route,token,{day:run.day,quantity:run.day<run.days-2?25:0});
  await control(config,'POST','/pause/learning');
  try {
   await request(config,'GET','/api/progress',token,undefined,503);
   run=await request(config,'POST',route,token,{day:run.day,quantity:0});
   await waitFor(()=>sql('simulation',async c=>{
    const pending=(await c.query('SELECT status,attempts FROM simulation_outbox_deliveries WHERE event_id IN (SELECT event_id FROM simulation_outbox WHERE aggregate_id=$1)',[run.id])).rows[0];
    return pending?.status==='PENDING'&&pending.attempts>=1;
   }));
  }finally{await control(config,'POST','/restart/learning');}
  assert.equal(run.day,7);assert.equal(run.timeline.length,7);assert(run.result.score>=70);assert(Number.isFinite(run.result.profit));
  await request(config,'POST',route,token,{day:run.day,quantity:0},409);
 });
 await check('outbox-delivery-deduplication-and-consistent-cross-service-progress',async()=>{
  await waitFor(()=>sql('simulation',async c=>(await c.query("SELECT status FROM simulation_outbox WHERE aggregate_id=$1",[run.id])).rows[0]?.status==='DELIVERED'));
  const payload=await sql('simulation',async c=>(await c.query('SELECT payload FROM simulation_outbox WHERE aggregate_id=$1',[run.id])).rows[0].payload);
  for(let i=0;i<2;i++){
   const response=await fetch(origins(config).edge+'/internal/events',{method:'POST',headers:{'Content-Type':'application/json','X-StockQuest-Event-Token':config.eventToken},body:JSON.stringify(payload)});assert.equal(response.status,204);
  }
  const n=await sql('learning',async c=>(await c.query('SELECT count(*)::int AS n FROM learning_simulation_inbox WHERE simulation_id=$1',[run.id])).rows[0].n);assert.equal(n,1);
  const progress=await request(config,'GET','/api/progress',token);assert.equal(progress.xp,630+run.result.score);assert.equal(progress.simulations,1);assert.equal(progress.passed,true);
  const report=await request(config,'GET','/api/reports/'+learner.id,leader);assert.deepEqual(report.progress,progress);assert.equal(report.activities.length,10);
  const team=await request(config,'GET','/api/reports',leader);assert.deepEqual(team.find(u=>u.id===learner.id).progress,progress);
 });
 await check('database-ownership-no-cross-service-connect-and-no-legacy-fallback',async()=>{
  const {Client}=require('pg');
  for(const key of ['people','learning','simulation']){
   const other=key==='people'?'learning':'people';
   const c=new Client({host:'127.0.0.1',port:5432,database:config.databases[other],...config.roles[key],connectionTimeoutMillis:3000});
   try{await assert.rejects(c.connect(),e=>e.code==='42501');}finally{await c.end().catch(()=>{});}
  }
  const response=await fetch(origins(config).web+'/api/auth/me',{headers:{Authorization:'Bearer '+token,'X-Correlation-Id':'phase6-consistent-id'}});
  assert.equal(response.status,200);assert.equal(response.headers.get('X-Correlation-Id'),'phase6-consistent-id');
 });
 await check('session-revocation-applies-to-all-three-services',async()=>{
  await request(config,'POST','/api/auth/logout',token,undefined,204);
  await request(config,'GET','/api/progress',token,undefined,401);
  await request(config,'GET','/api/modules',token,undefined,401,'learning');
  await request(config,'GET','/api/simulations/scenarios',token,undefined,401,'simulation');
  token=(await login(config,account)).token;
 });
 await check('service-restarts-preserve-curriculum-progress-membership-and-results',async()=>{
  for(const key of ['learning','simulation','people'])await control(config,'POST','/restart/'+key);
  const current=await request(config,'GET','/api/simulations/'+run.id,token);assert.equal(current.result.id,run.result.id);
  const progress=await request(config,'GET','/api/progress',token);assert.equal(progress.xp,630+run.result.score);
  const groups=await request(config,'GET','/api/groups',leader);assert.equal(groups.find(g=>g.id===group.id).members[0].userId,learner.id);
 });
 // Password hashing is measured outside the read-load sample; all accounts are exclusive fixtures.
 await check('representative-local-team-setup',async()=>{
  for(let i=0;i<8;i++)await request(config,'POST','/api/users',leader,{name:'Aprendiz carga '+i,document:randomBytes(12).toString('hex'),email:`load-${runId}-${i}@example.test`,password:randomBytes(20).toString('hex'),company:'Stock Quest'},201);
 });
 await check('local-read-latency-nine-topics-and-current-team',async()=>{
  sample.teamMembers=(await request(config,'GET','/api/reports',leader)).length;
  await measure('learning-route',5,15,()=>request(config,'GET','/api/modules',token));
  await measure('progress',5,15,()=>request(config,'GET','/api/progress',token));
  await measure('leader-team-report',3,9,()=>request(config,'GET','/api/reports',leader));
 });
 return {learnerId:learner.id,simulationId:run.id,score:run.result.score,profit:run.result.profit,expectedXp:630+run.result.score};
}
let result;
main().then(ids=>{result={status:'PASS',...ids};}).catch(e=>{result={status:'FAIL',error:e.code?'PostgreSQL '+e.code:e.message};process.exitCode=1;})
 .finally(()=>{const report={...result,runId,checks,measurements,sample,databases:config.databases,ports:config.ports,finishedAt:new Date().toISOString(),limits:'Local sample only. UI browser and external videos not certified. No learning/personas projections enabled.'};
  fs.writeFileSync(path.join(directory,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,reportPath:path.join(directory,'report.json')},null,2));});
