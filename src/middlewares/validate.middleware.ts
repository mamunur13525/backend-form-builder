import { Request, Response, NextFunction } from "express";
import { ZodError, ZodTypeAny } from "zod";
import { ApiError } from "../utils/ApiError";
import { httpStatus } from "../constants/httpStatus";

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export const validate = (schemas: ValidationSchemas) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as any;
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as any;
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
