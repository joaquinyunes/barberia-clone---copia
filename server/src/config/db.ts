import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../lib/logger.js";

export async function connectDB(uri = env.MONGO_URI) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  logger.info({ db: mongoose.connection.name }, "MongoDB conectado");
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
