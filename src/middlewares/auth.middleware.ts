import { Request, Response, NextFunction } from "express";
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

export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
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