/* Keep the frontend proxy aligned with the selected development gateway on Windows and Unix. */
const { spawn } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const legacy = process.argv.includes('--legacy');
const child = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', legacy ? '5173' : '5174', '--strictPort'], {
  cwd: path.join(root, 'frontend'), stdio: 'inherit', windowsHide: true,
  env: { ...process.env, SQ_API_PROXY_TARGET: process.env.SQ_API_PROXY_TARGET || (legacy ? 'http://127.0.0.1:4000' : 'http://127.0.0.1:14600') },
});
child.on('error', () => { console.error('No se pudo iniciar Vite.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
