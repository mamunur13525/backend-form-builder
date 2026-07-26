import mongoose from "mongoose";

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.JWT_EXPIRES_IN = "1h";
process.env.JWT_REFRESH_EXPIRES_IN = "1h";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/typeform-test";

// Cleanup after all tests
afterAll(async () => {
  await mongoose.connection.close();
});

// Close connection after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
  }
});
