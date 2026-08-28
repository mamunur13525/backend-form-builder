import { Request, Response, NextFunction } from "express";
import { ZodError, ZodTypeAny } from "zod";
import { ApiError } from "../utils/ApiError";
import { httpStatus } from "../constants/httpStatus";

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Express 5 exposes `req.query` (and `req.params`) as getter-only accessor
 * properties, so a plain `req.query = ...` assignment throws
 * "Cannot set property query of #<IncomingMessage> which has only a getter".
 * Redefining the property as an own writable value shadows the getter, which
 * lets us persist Zod's coerced/defaulted output for downstream handlers.
 */
const setRequestProp = (req: Request, key: "query" | "params", value: unknown): void => {
  Object.defineProperty(req, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
};

export const validate = (schemas: ValidationSchemas) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        setRequestProp(req, "query", schemas.query.parse(req.query));
      }
      if (schemas.params) {
        setRequestProp(req, "params", schemas.params.parse(req.params));
      }
      next();
    } catch (error: any) {
      if (error?.issues) {
        const errors = error.issues.map((e: { path: (string | number)[]; message: string }) => ({
          page: e.path.join("."),
          message: e.message,
        }));
        throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, "Validation failed", errors);
      }
      throw error;
    }
  };
};
