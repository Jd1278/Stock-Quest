/* Read-only acceptance inventory. Passing this audit does not approve pending requirements. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),directory=path.join(root,'docs/verificaciones/retirada-legacy-20261021');
fs.mkdirSync(directory,{recursive:true});
const archivedSource=file=>file.startsWith('backend/')?'legacy/'+file:file==='scripts/verify-phase7.ps1'?'legacy/'+file:file;
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const matrix=read('docs/verificaciones/fase7-20261019/matriz-requisitos.json');
const expected=[...Array.from({length:20},(_,i)=>'RF'+String(i+1).padStart(2,'0')),...Array.from({length:6},(_,i)=>'RNF'+String(i+1).padStart(2,'0'))];
assert.deepEqual(matrix.entries.map(e=>e.id).sort(),expected.sort());
const statuses=new Set(['validado-local','parcial','pendiente']),files=new Set();
for(const entry of matrix.entries){
 assert(statuses.has(entry.status));assert(entry.assessment&&entry.sources.length);
 for(const file of [...entry.sources,...entry.testSources]){const absolute=path.resolve(root,archivedSource(file));assert(absolute.startsWith(root+path.sep));assert(fs.statSync(absolute).isFile());files.add(archivedSource(file));}
}
const sourceHash=crypto.createHash('sha256').update(fs.readFileSync(matrix.requirements.path)).digest('hex');assert.equal(sourceHash,matrix.requirements.sha256);
const capabilities={
 'personas-capacitacion':{base:'personas',slices:['identidad','usuarios','capacitacion']},
 'aprendizaje-evaluacion':{base:'aprendizaje',slices:['contenidos','evaluaciones','progreso']},
 'simulacion-logistica':{base:'simulacion',slices:['escenarios','partidas']}
};
for(const [service,{base,slices}]of Object.entries(capabilities)){
 const prefix=`services/${service}/`;
 for(const file of ['pom.xml','mvnw.cmd','src/main/resources/application.properties']){assert(fs.existsSync(path.join(root,prefix+file)));files.add(prefix+file);}
 const pom=fs.readFileSync(path.join(root,prefix+'pom.xml'),'utf8');assert(pom.includes('<maven.compiler.release>21</maven.compiler.release>'));
 for(const slice of ['',...slices])for(const layer of ['Application','domain','Infrastructure'])
  assert(fs.statSync(path.join(root,prefix,'src/main/java/com/stockquest',base,slice,layer)).isDirectory(),`${service}/${slice}/${layer}`);
}
const counts=list=>Object.fromEntries([...statuses].map(status=>[status,list.filter(e=>e.status===status).length]));
const report={status:'PASS - traceability and architecture inventory; pending requirements remain pending',requirements:26,
 functional:counts(matrix.entries.filter(e=>e.id.startsWith('RF'))),nonfunctional:counts(matrix.entries.filter(e=>e.id.startsWith('RNF'))),
 services:3,capabilities:8,documentSha256:sourceHash,productionAcceptance:false};
for(const file of ['scripts/local-java.cjs','legacy/scripts/verify-phase7.ps1','scripts/verify-phase7-runtime.cjs','scripts/verify-admin-deletion.cjs','scripts/verify-acceptance.cjs','contracts/openapi-compatibilidad.json','contracts/propiedad-datos.json','package-lock.json'])files.add(file);
const hashes=[...files].sort().map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}));
fs.writeFileSync(path.join(directory,'fuentes.json'),JSON.stringify(hashes,null,2));
if(!process.argv.includes('--sources-only')){
 const suites=read('docs/verificaciones/fase7-20261019/pruebas.json');
 assert(suites.success&&suites.uniqueSuiteTests>0);for(const suite of suites.java)assert(suite.failures===0&&suite.errors===0&&suite.skipped===0);
 for(const runner of [suites.backend,suites.frontend])assert(runner.failed===0&&runner.skipped===0&&runner.tests===runner.passed);
 for(const name of ['runtime-directo.json','eliminacion-http.json'])assert.equal(read('docs/verificaciones/fase7-20261019/'+name).status,'PASS');
 report.historicalSuiteTests=suites.uniqueSuiteTests;report.historicalExecutionDate="2026-10-19";
}
fs.writeFileSync(path.join(directory,'auditoria.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
