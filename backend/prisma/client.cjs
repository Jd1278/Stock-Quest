/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');

function createClient() {
  return new PrismaClient();
}

module.exports = { createClient };
