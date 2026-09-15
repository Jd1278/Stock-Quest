import { config } from 'dotenv';
import client from '../prisma/client.cjs';
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--env')) {
 console.error('Uso: npm run db:check -- --env RUTA_ABSOLUTA'); process.exit(1);
}
const loaded = config(args.length ? {path:args[1],override:true} : {});
if(args.length && loaded.error) { console.error('No se pudo leer el archivo indicado.'); process.exit(1); }
let db;
try {
 db = client.createClient();
 await db.$connect();
 await db.$queryRaw`SELECT 1`;
 const status = await db.$queryRaw`SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()`;
 console.log('Conexión PostgreSQL verificada. No se modificaron datos.');
 console.log(status[0]?.ssl ? 'Transporte TLS: activo.' : 'Transporte TLS: no activo.');
} catch(error) {
 console.error('No se pudo conectar a PostgreSQL. Revisa URL, credenciales, red y TLS.');
 if (/^[A-Z0-9_]+$/.test(String(error.code))) console.error('Código:',error.code);
 process.exitCode = 1;
} finally { if(db) await db.$disconnect(); }
