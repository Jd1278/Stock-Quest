/* Local verification helper. Credentials are read only from the session environment. */
const { Client } = require('pg');

const host = '127.0.0.1';
const port = 5432;
const password = process.env.SQ_VERIFY_DB_PASSWORD;
if (!password) throw new Error('Set SQ_VERIFY_DB_PASSWORD in the session.');

async function main() {
  let client;
  for (const user of ['sq_phase4_test', 'postgres']) {
    const candidate = new Client({ host, port, user, password, database: 'postgres', connectionTimeoutMillis: 3000 });
    try {
      await candidate.connect();
      if (process.argv[2] === 'prepare') {
        const role = (await candidate.query('SELECT rolcreatedb OR rolsuper AS allowed FROM pg_roles WHERE rolname=current_user')).rows[0];
        if (!role?.allowed) { await candidate.end(); continue; }
      }
      client = candidate; break;
    }
    catch { await candidate.end().catch(() => {}); }
  }
  if (!client) throw new Error('The supplied credential did not connect using the known local test roles.');
  try {
    const identity = (await client.query('SELECT current_user AS username, version() AS version')).rows[0];
    const databases = (await client.query("SELECT datname AS name, pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname LIKE 'stockquest_test%' OR datname LIKE 'sq_test_%' ORDER BY datname")).rows;
    console.log(JSON.stringify({ connected: true, host, port, ...identity, databases }, null, 2));
    if (process.argv[2] === 'prepare') {
      const suffix = process.env.SQ_VERIFY_SUFFIX;
      if (!suffix || !/^[a-z0-9_]{1,30}$/.test(suffix)) throw new Error('Set a bounded SQ_VERIFY_SUFFIX.');
      const names = [`sq_test_learning_${suffix}`, `sq_test_simulation_${suffix}`, `sq_test_backend_${suffix}`];
      for (const name of names) {
        // Only fresh, explicitly bounded verification names can reach this DDL.
        if ((await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount) throw new Error('Verification database already exists: ' + name);
        await client.query('CREATE DATABASE "' + name + '" OWNER sq_phase4_test');
        console.log('Created exclusive verification database: ' + name);
      }
    }
  } finally { await client.end(); }
}
main().catch(error => { console.error(error.code ? 'PostgreSQL error: ' + error.code : error.message); process.exitCode = 1; });
