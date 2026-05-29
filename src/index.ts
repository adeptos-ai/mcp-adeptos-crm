import express from "express";
import { config } from "./config/env.js";
import { logger } from "./utils/logger.js";
import routes from "./routes/index.js";

const app = express();

app.use(express.json());

// Load all routes
app.use("/", routes);

app.listen(config.port, "0.0.0.0", () => {
  logger.info(`MCP Adeptos CRM server listening on port ${config.port} in ${config.nodeEnv} mode`);
});
