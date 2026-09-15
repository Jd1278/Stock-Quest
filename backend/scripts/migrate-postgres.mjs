import { config } from 'dotenv';
import { Pool } from 'pg';
import { readdirSync, readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import connection from '../prisma/client.cjs';
const args=process.argv.slice(2);
if(args.length && (args.length!==2 || args[0]!=='--env')) throw new Error('Uso: migrate-postgres.mjs [--env RUTA]');
const loaded=config(args.length ? {path:args[1],override:true}:{});
if(args.length && loaded.error) throw new Error('No se pudo leer la configuración.');
const {pool:options,schema}=connection.connectionOptions();
const pool=new Pool(options);
let db;
try {
 db=await pool.connect();
 await db.query('BEGIN');
 await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['stock-quest-migrations:'+schema]);
 await db.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
 await db.query(`SET LOCAL search_path TO "${schema}"`);
 const tables=await db.query('SELECT tablename FROM pg_tables WHERE schemaname=$1',[schema]);
 if(tables.rows.length && !tables.rows.some(r=>r.tablename==='_prisma_migrations')) throw new Error('El esquema tiene tablas sin historial Prisma. Se requiere revisar y establecer una línea base.');
 await db.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
 "id" VARCHAR(36) PRIMARY KEY, "checksum" VARCHAR(64) NOT NULL,
 "finished_at" TIMESTAMPTZ, "migration_name" VARCHAR(255) NOT NULL,
 "logs" TEXT, "rolled_back_at" TIMESTAMPTZ, "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
 "applied_steps_count" INTEGER NOT NULL DEFAULT 0)`);
 const directory=fileURLToPath(new URL('../prisma/migrations/',import.meta.url));
 for(const entry of readdirSync(directory,{withFileTypes:true}).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name))) {
  const sql=readFileSync(`${directory}/${entry.name}/migration.sql`,'utf8');
  const checksum=createHash('sha256').update(sql).digest('hex');
  const existing=await db.query('SELECT checksum,finished_at FROM "_prisma_migrations" WHERE migration_name=$1 AND rolled_back_at IS NULL',[entry.name]);
  if(existing.rows.length) {if(existing.rows.some(r=>r.checksum!==checksum || !r.finished_at)) throw new Error('Migración modificada o incompleta: '+entry.name);continue;}
  await db.query(sql);
  await db.query('INSERT INTO "_prisma_migrations" (id,checksum,migration_name,finished_at,applied_steps_count) VALUES ($1,$2,$3,now(),1)',[randomUUID(),checksum,entry.name]);
  console.log('Migración aplicada:',entry.name);
 }
 await db.query('COMMIT'); console.log('Migraciones PostgreSQL al día.');
} catch(error) {
 if(db) await db.query('ROLLBACK').catch(()=>{});
 console.error('No se aplicaron cambios de esta ejecución. Revisa el esquema y la conexión.');
 if(/^[A-Z0-9_]+$/.test(String(error.code))) console.error('Código:',error.code);
 process.exitCode=1;
} finally {db?.release();await pool.end();}
