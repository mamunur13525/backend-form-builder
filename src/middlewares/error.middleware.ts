import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
      ...(env.nodeEnv === "development" && { stack: err.stack }),
    });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: [err.message],
    });
  }

  // Mongoose duplicate key error
  if ((err as any).code === 11000) {
    const page = Object.keys((err as any).keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `Duplicate value for ${page}`,
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
    });
  }

  // Default server error
  console.error("Unhandled error:", err);
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    ...(env.nodeEnv === "development" && { stack: err.stack }),
  });
};