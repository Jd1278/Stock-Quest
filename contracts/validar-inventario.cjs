// Read-only structural checks. This is not an OpenAPI/JSON Schema semantic validator.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const spec = JSON.parse(read('contracts/openapi-compatibilidad.json'));
const owners = JSON.parse(read('contracts/propiedad-datos.json'));
const events = JSON.parse(read('contracts/eventos-v1.schema.json'));
const routes = read('backend/src/routes/index.ts');
const expected = new Set();
const normalize = value => value.replace(/:([A-Za-z][A-Za-z0-9]*)/g, '{$1}');

// Inventory the inspected router, including its generated administrative routes.
for (const match of routes.matchAll(/(router|leader|admin)\.(get|post|put|patch|delete)\("([^"]+)",/g)) {
  const route = (match[1] === 'admin' ? '/admin' : '') + (match[3] === '/' ? '' : match[3]);
  expected.add(match[2].toUpperCase() + ' ' + normalize(route));
}
for (const match of routes.matchAll(/\["(modules|lessons|challenges|scenarios)",\s*"[^"]+"\]/g)) {
  expected.add('POST /admin/' + match[1]);
  expected.add('PUT /admin/' + match[1] + '/{id}');
}
if (!read('backend/src/app.ts').includes('app.get("/api/health",')) {
  throw new Error('Health route source changed; review the inventory parser.');
}
expected.add('GET /health');

const actual = new Set();
const operationIds = new Set();
const services = new Set(['personas-capacitacion', 'aprendizaje-evaluacion', 'simulacion-logistica']);
for (const [route, methods] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(methods)) {
    actual.add(method.toUpperCase() + ' ' + route);
    if (operationIds.has(operation.operationId)) throw new Error('Duplicate operationId');
    operationIds.add(operation.operationId);
    if (!services.has(operation['x-owner']) && !['entrada-http', 'composicion-compatibilidad'].includes(operation['x-owner'])) {
      throw new Error('Unknown operation owner');
    }
    if (!Array.isArray(operation['x-roles'])) throw new Error('Missing roles');
    for (const match of route.matchAll(/\{([^}]+)\}/g)) {
      if (!operation.parameters?.some(p => p.name === match[1] && p.in === 'path' && p.required)) {
        throw new Error('Missing path parameter: ' + route);
      }
    }
  }
}
const missing = [...expected].filter(value => !actual.has(value));
const extra = [...actual].filter(value => !expected.has(value));
if (missing.length || extra.length) throw new Error(JSON.stringify({ missing, extra }));

const models = [...read('backend/prisma/schema.prisma').matchAll(/^model\s+(\w+)\s*\{/gm)].map(match => match[1]);
if (models.some(model => !services.has(owners.models[model])) || Object.keys(owners.models).some(model => !models.includes(model))) {
  throw new Error('Model ownership mismatch');
}
let references = 0;
function checkReferences(document, node) {
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref') {
      if (!value.startsWith('#/')) throw new Error('Unexpected external reference: ' + value);
      let target = document;
      for (const segment of value.slice(2).split('/')) {
        target = target?.[segment.replace(/~1/g, '/').replace(/~0/g, '~')];
      }
      if (!target) throw new Error('Unresolved reference: ' + value);
      references++;
    } else {
      checkReferences(document, value);
    }
  }
  if (node.type === 'object' && node.required) {
    for (const key of node.required) {
      if (!(key in node.properties)) throw new Error('Required property without definition: ' + key);
    }
  }
}
checkReferences(spec, spec);
checkReferences(events, events);
const mapped = new Set(Object.values(spec.paths).flatMap(methods => Object.values(methods).flatMap(op => op['x-requirements'])));
const frontendOnly = ['RF04'];
for (let number = 1; number <= 20; number++) {
  const requirement = 'RF' + String(number).padStart(2, '0');
  if (!mapped.has(requirement) && !frontendOnly.includes(requirement)) throw new Error('Unmapped requirement: ' + requirement);
}
console.log(JSON.stringify({
  status: 'PASS - structural inventory only',
  expectedOperations: expected.size,
  contractOperations: actual.size,
  paths: Object.keys(spec.paths).length,
  ownedModels: models.length,
  eventTypes: events.oneOf.length,
  resolvedReferences: references,
  requirementsMapped: mapped.size,
  frontendOnly,
}, null, 2));
