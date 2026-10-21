/* Source/configuration checks only: never changes processes or databases. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
assert.deepEqual([...pkg.workspaces].sort(), ['frontend', 'gateway']);
assert(!fs.existsSync(path.join(root, 'backend')), 'Original backend must be archived, not active');
assert(!Object.keys(pkg.scripts).some(name => name.startsWith('db:') || name.endsWith(':legacy')));
assert(!Object.keys(lock.packages).some(name => /prisma|(?:^|\/)backend(?:\/|$)|@stock-quest\/api/.test(name)));
assert(!Object.keys(lock.packages).some(name => lock.packages[name].extraneous));
const manifest = JSON.parse(read('legacy/source-manifest.json'));
for (const file of manifest) {
  const archived = path.resolve(root, 'legacy', file.file);
  assert(archived.startsWith(path.join(root, 'legacy') + path.sep));
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(archived)).digest('hex'), file.sha256, file.file);
}
for (const name of ['api/index.js', 'scripts/local-java.cjs', 'render.yaml', 'vercel.json', '.github/workflows/ci.yml']) {
  assert(!/backend\/|@stock-quest\/api|db:migrate|db:generate/.test(read(name)), 'Retired dependency in ' + name);
}
assert.equal(JSON.parse(read('vercel.json')).functions['api/index.js'].includeFiles, 'gateway/dist/**');
console.log(JSON.stringify({ status: 'PASS', activeWorkspaces: pkg.workspaces, archivedSourcesVerified: manifest.length,
  prismaInActiveLockfile: false, legacyWriteCommands: false, databasesModified: false }, null, 2));
