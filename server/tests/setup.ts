import mongoose from "mongoose";
import { afterAll, beforeAll } from "vitest";

process.env.NODE_ENV = "test";
process.env.UPLOAD_DIR = "uploads-test";

beforeAll(async () => {
  const uri = process.env.MONGO_TEST_URI ?? "mongodb://127.0.0.1:27017/jeb-test";
  await mongoose.connect(uri);
  await mongoose.connection.db!.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
});

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase();
  await mongoose.disconnect();
});
