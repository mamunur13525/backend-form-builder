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

app.use(cors(corsOptions));
app.use(cookieParser());

// Body parsing. The `verify` callback stashes the raw bytes of every JSON
// request on `req.rawBody` so webhook endpoints can verify HMAC signatures
// over the exact payload the provider signed (Lemon Squeezy billing webhook).
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  })
);
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