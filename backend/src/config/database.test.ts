// eslint-disable-next-line @typescript-eslint/no-require-imports
const { connectionOptions, createClient } = require('../../prisma/client.cjs');

test('migration options preserve schema and enforce TLS certificate validation by default', () => {
  const value = connectionOptions('postgresql://test:secret@db.example.com/app?sslmode=require&schema=sq_test_one&connection_limit=3&connect_timeout=7');
  expect(value.schema).toBe('sq_test_one');
  expect(value.pool.ssl).toEqual({ rejectUnauthorized: true });
  expect(value.pool.max).toBe(3);
  expect(value.pool.connectionTimeoutMillis).toBe(7000);
  const connectionUrl = new URL(value.pool.connectionString);
  for (const key of ['schema', 'sslmode', 'sslaccept', 'connection_limit', 'connect_timeout']) {
    expect(connectionUrl.searchParams.has(key)).toBe(false);
  }
});

test('migration options reject non-PostgreSQL URLs and unsafe schema identifiers', () => {
  expect(() => connectionOptions('mysql://test:secret@localhost/app')).toThrow('DATABASE_URL debe ser PostgreSQL.');
  expect(() => connectionOptions('postgresql://test:secret@localhost/app?schema=bad%22schema')).toThrow('Schema PostgreSQL inválido.');
});

test('local migration options default to public schema and allow TLS to be disabled', () => {
  for (const value of [
    'postgresql://test:secret@localhost/app',
    'postgresql://test:secret@localhost/app?sslmode=disable',
  ]) {
    const options = connectionOptions(value);
    expect(options.schema).toBe('public');
    expect(options.pool.ssl).toBe(false);
    expect(options.pool.max).toBe(5);
    expect(options.pool.connectionTimeoutMillis).toBe(15000);
  }
});

test('createClient returns a PrismaClient instance', () => {
  const client = createClient();
  expect(client).toBeDefined();
  expect(typeof client.$connect).toBe('function');
  expect(typeof client.$disconnect).toBe('function');
});
