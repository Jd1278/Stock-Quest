/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const { readFileSync } = require('node:fs');
const path = require('node:path');

// The migration runner uses node-postgres; the application keeps Prisma's binary engine.
function connectionOptions(value = process.env.DATABASE_URL) {
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL debe ser PostgreSQL.');
  }
  const params = url.searchParams;
  const schema = params.get('schema') || 'public';
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    throw new Error('Schema PostgreSQL inválido.');
  }
  const mode = params.get('sslmode');
  const ssl = mode && mode !== 'disable'
    ? { rejectUnauthorized: params.get('sslaccept') !== 'accept_invalid_certs' }
    : false;
  const certificate = params.get('sslcert') || params.get('sslrootcert');
  if (ssl && certificate) {
    ssl.ca = readFileSync(path.resolve(__dirname, certificate), 'utf8');
  }
  const max = Number(params.get('connection_limit') || 5);
  const connectionTimeoutMillis = Number(params.get('connect_timeout') || 15) * 1000;
  for (const key of ['schema', 'sslmode', 'sslaccept', 'sslcert', 'sslrootcert', 'connection_limit', 'connect_timeout']) {
    params.delete(key);
  }
  return { schema, pool: { connectionString: url.toString(), ssl, max, connectionTimeoutMillis } };
}

function createClient() {
  return new PrismaClient();
}

module.exports = { connectionOptions, createClient };
