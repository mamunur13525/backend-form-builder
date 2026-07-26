import { Response } from "express";

interface ApiResponseOptions {
  success: boolean;
  message: string;
  data?: any;
  errors?: any[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export const sendResponse = (res: Response, options: ApiResponseOptions, statusCode = 200) => {
  const response: ApiResponseOptions = {
    success: options.success,
    message: options.message,
  };

  if (options.data !== undefined) {
    response.data = options.data;
  }

  if (options.errors) {
    response.errors = options.errors;
  }

  if (options.meta) {
    response.meta = options.meta;
  }

  return res.status(statusCode).json(response);
};

export const sendSuccess = (
  res: Response,
  data: any,
  message = "Success",
  statusCode = 200
) => {
  return sendResponse(res, { success: true, message, data }, statusCode);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  errors?: any[]
) => {
  return sendResponse(res, { success: false, message, errors }, statusCode);
};