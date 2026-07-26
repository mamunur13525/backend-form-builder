import { Request, Response } from "express";
import { httpStatus } from "../constants/httpStatus";

export const notFoundHandler = (_req: Request, res: Response) => {
  return res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: "Route not found",
  });
};