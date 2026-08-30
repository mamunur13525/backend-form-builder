import mongoose from "mongoose";

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.JWT_EXPIRES_IN = "1h";
process.env.JWT_REFRESH_EXPIRES_IN = "1h";

/**
 * Test database setup.
 *
 * IMPORTANT: the app's `config/env.ts` loads `.env` lazily via dotenv, which
 * points at the shared/production MongoDB. We therefore NEVER connect tests to
 * `process.env.MONGODB_URI` (the existing test files drop the database in
 * `afterEach` — running that against a shared cluster would be catastrophic).
 *
 * Instead:
 *  - If `TEST_MONGODB_URI` is set explicitly, connect to that (e.g. a local
 *    mongod the developer controls).
 *  - Otherwise spin up an in-memory MongoDB via mongodb-memory-server.
 */
let mongod: { stop(): Promise<unknown> } | undefined;

function isExplicitTestUri(): string | null {
  const uri = process.env.TEST_MONGODB_URI;
  return uri && uri.trim() ? uri.trim() : null;
}

beforeAll(async () => {
  const explicitUri = isExplicitTestUri();
  if (explicitUri) {
    process.env.MONGODB_URI = explicitUri;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MongoMemoryServer } = require("mongodb-memory-server");
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
  }
  await mongoose.connect(process.env.MONGODB_URI);
});

// Cleanup after all tests
afterAll(async () => {
  await mongoose.connection.close();
  if (mongod) {
    await mongod.stop();
    mongod = undefined;
  }
});

// Close connection after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
  }
});
