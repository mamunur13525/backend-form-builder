import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { corsOptions } from "./config/cors";
import { requestLogger } from "./config/logger";
import { generalRateLimiter } from "./middlewares/rate-limit.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import { notFoundHandler } from "./middlewares/not-found.middleware";
import routes from "./routes";

const app: Express = express();

// Security middleware
app.use(helmet());
console.log({ corsOptions })
app.use(cors(corsOptions));
app.use(cookieParser());

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(requestLogger);

// Rate limiting
app.use(generalRateLimiter);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use(routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;