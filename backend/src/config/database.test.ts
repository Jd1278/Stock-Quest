// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require('../../prisma/client.cjs');

test('createClient returns a PrismaClient instance', () => {
  const client = createClient();
  expect(client).toBeDefined();
  expect(typeof client.$connect).toBe('function');
  expect(typeof client.$disconnect).toBe('function');
});
