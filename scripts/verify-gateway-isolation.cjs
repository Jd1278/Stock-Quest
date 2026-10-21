/* Run after the gateway build. Fails if the executable imports the retired backend or SQL drivers. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const result = execFileSync(process.execPath, ['-e', String.raw`
  const Module=require('node:module'), original=Module._load;
  Module._load=function(name,...args){
    if (/^(?:@prisma(?:\/|$)|prisma$|pg(?:\/|$)|bcrypt$|jsonwebtoken$)/.test(name)) throw new Error('Forbidden gateway dependency: '+name);
    return original.call(this,name,...args);
  };
  require('./gateway/dist/app.js');
  Object.assign(process.env, {
    PEOPLE_SERVICE_URL:'http://127.0.0.1:14630', LEARNING_SERVICE_URL:'http://127.0.0.1:14620', SIMULATION_SERVICE_URL:'http://127.0.0.1:14610',
    LEARNING_SERVICE_TOKEN:'verification-learning-token-32-characters', SIMULATION_SERVICE_TOKEN:'verification-simulation-token-32-characters'
  });
  if(typeof require('./api/index.js') !== 'function') throw new Error('Invalid serverless gateway export');
  const loaded=Object.keys(require.cache).map(p=>p.split(require('node:path').sep).join('/'));
  if(loaded.some(p=>p.includes('/Stock-Quest/backend/') || p.includes('/Stock-Quest/legacy/'))) throw new Error('Legacy backend imported');
  console.log(JSON.stringify({status:'PASS',loadedModules:loaded.length,legacyImports:0,sqlDrivers:0}));
`], { cwd: root, encoding: 'utf8', windowsHide: true });
const report = JSON.parse(result);
assert.equal(report.status, 'PASS');
const pkg = require('../gateway/package.json');
assert(!Object.keys(pkg.dependencies).some(name => /prisma|^pg$|bcrypt|jsonwebtoken/.test(name)));
console.log(JSON.stringify(report, null, 2));
