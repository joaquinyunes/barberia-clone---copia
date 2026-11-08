import mongoose from "mongoose";
import { afterAll, beforeAll } from "vitest";

process.env.NODE_ENV = "test";
process.env.UPLOAD_DIR = "uploads-test";
// Credenciales de mentira: los tests de Mercado Pago mockean el SDK y firman con este secreto.
process.env.MP_ACCESS_TOKEN ??= "TEST-token-de-prueba";
process.env.MP_WEBHOOK_SECRET ??= "test-webhook-secret";

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
