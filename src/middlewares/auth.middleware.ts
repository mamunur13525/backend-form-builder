import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { httpStatus } from "../constants/httpStatus";
import { asyncHandler } from "../utils/asyncHandler";

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export const authenticate: RequestHandler = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name,
      };
      next();
    } catch (error) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid or expired token");
    }
  }
);

/**
 * Attaches `req.user` when a valid Bearer token is present, but never rejects
 * the request when the token is missing or invalid. Use on endpoints that are
 * public yet want to personalise the response for signed-in users (e.g. the
 * feedback list needs to know whether the current viewer has upvoted a post).
 */
export const optionalAuthenticate: RequestHandler = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      next();
      return;
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name,
      };
    } catch {
      // Ignore an invalid/expired token — treat the request as anonymous.
    }

    next();
  }
);

export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Authentication required");
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You do not have permission to perform this action"
      );
    }

    next();
  };
};