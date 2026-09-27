import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { logger } from "./lib/logger.js";
import { startJobs } from "./jobs/index.js";

await connectDB();
startJobs();
createApp().listen(env.PORT, () => logger.info(`API escuchando en http://localhost:${env.PORT}/api/v1`));
