import rateLimit from "express-rate-limit";
import { env } from "../config/env";

const isTest = () => env.nodeEnv === "test" || process.env.NODE_ENV === "test";

export const generalRateLimiter = rateLimit({
  windowMs: env.rateLimitWindow * 60 * 1000,
  max: env.rateLimitMax,
  skip: isTest,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: isTest,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const publicFormRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  skip: isTest,
  message: {
    success: false,
    message: "Too many requests, please slow down",
  },
  standardHeaders: true,
  legacyHeaders: false,
});