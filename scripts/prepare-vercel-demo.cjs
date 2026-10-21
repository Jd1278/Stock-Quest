// Prepare a static-only deployment directory. Never deploys or reads credentials.
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
async function main() {
  const origin = new URL(process.argv[2]);
  if (origin.protocol !== 'https:' || !/^[a-z0-9-]+\.trycloudflare\.com$/.test(origin.hostname) || origin.port || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('Provide only the HTTPS origin of the temporary trycloudflare.com tunnel.');
  }
  const health = await fetch(origin.origin + '/api/health', { signal: AbortSignal.timeout(20000) });
  if (!health.ok || (await health.json()).status !== 'ok') throw new Error('The tunnel API health check did not pass.');
  const dist = path.join(root, 'frontend', 'dist');
  await fs.access(path.join(dist, 'index.html'));
  const files = [];
  async function walk(directory, relative = '') {
    for (const item of await fs.readdir(directory, { withFileTypes: true })) {
      const name = path.join(relative, item.name);
      if (item.name.startsWith('.') || item.isSymbolicLink()) throw new Error('Unexpected hidden file or symlink in frontend build: ' + name);
      if (item.isDirectory()) await walk(path.join(directory, item.name), name);
      else if (item.isFile()) {
        if (!/\.(html|js|css|png|jpg|jpeg|webp|svg|ico|woff2?|ttf|otf|json|txt|mp3|mp4)$/i.test(item.name)) throw new Error('Unexpected frontend build artifact: ' + name);
        files.push(name);
      } else throw new Error('Unexpected artifact: ' + name);
    }
  }
  await walk(dist);
  const directory = path.join(root, '.stockquest-local', 'vercel-demo-' + randomUUID().slice(0, 8));
  await fs.mkdir(directory, { recursive: true });
  const inventory = [];
  for (const file of files) {
    const source = path.join(dist, file), dest = path.join(directory, file);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(source, dest);
    inventory.push({ file: file.replaceAll('\\', '/'), sha256: createHash('sha256').update(await fs.readFile(dest)).digest('hex') });
  }
  const securityHeaders = JSON.parse(await fs.readFile(path.join(root, 'vercel.json'), 'utf8')).routes[0].headers;
  const config = {
    $schema: 'https://openapi.vercel.sh/vercel.json', version: 2,
    framework: null, buildCommand: null, installCommand: null, outputDirectory: '.',
    routes: [
      { src: '/(.*)', headers: securityHeaders, continue: true },
      { src: '/api', dest: origin.origin + '/api', headers: { 'Cache-Control': 'no-store' } },
      { src: '/api/(.*)', dest: origin.origin + '/api/$1', headers: { 'Cache-Control': 'no-store' } },
      { handle: 'filesystem' },
      { src: '/(.*)', dest: '/index.html' },
    ],
  };
  await fs.writeFile(path.join(directory, 'vercel.json'), JSON.stringify(config, null, 2) + '\n');
  await fs.writeFile(path.join(directory, '.vercelignore'), '.env\n.env.*\n*.log\n');
  const record = { directory, apiOrigin: origin.origin, createdAt: new Date().toISOString(), files: inventory, deployed: false };
  await fs.writeFile(path.join(root, '.stockquest-local', 'latest-vercel-demo.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify({ directory, apiHealth: 'ok', staticFiles: files.length, deployed: false }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
