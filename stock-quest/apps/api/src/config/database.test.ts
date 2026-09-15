// eslint-disable-next-line @typescript-eslint/no-require-imports
const {connectionOptions}=require('../../prisma/client.cjs');
test('remote PostgreSQL requires TLS with certificate validation by default',()=>{const value=connectionOptions('postgresql://test:secret@db.example.com/app?sslmode=require&schema=sq_test_one&connection_limit=3');expect(value.pool.ssl.rejectUnauthorized).toBe(true);expect(value.schema).toBe('sq_test_one');expect(value.pool.max).toBe(3);expect(value.pool.connectionString).not.toContain('sslmode');});
test('MySQL URLs and invalid schema identifiers are rejected',()=>{expect(()=>connectionOptions('mysql://user:pass@localhost/db')).toThrow();expect(()=>connectionOptions('postgresql://user:pass@localhost/db?schema=bad%22schema')).toThrow();});
test('local PostgreSQL can run without TLS',()=>{expect(connectionOptions('postgresql://user:pass@localhost/db').pool.ssl).toBe(false);});
