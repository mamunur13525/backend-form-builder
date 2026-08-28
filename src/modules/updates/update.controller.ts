import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import * as updateService from "./update.service";

export const listUpdates: RequestHandler = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const updates = await updateService.listUpdates();
    sendSuccess(res, updates, "Updates retrieved successfully");
  }
);

export const getProductActivity: RequestHandler = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const activity = await updateService.getProductActivity();
    sendSuccess(res, activity, "Product activity retrieved successfully");
  }
);

export const getUpdate: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const update = await updateService.getUpdate(req.params.slug as string);
    sendSuccess(res, update, "Update retrieved successfully");
  }
);

export const createUpdate: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const update = await updateService.createUpdate(req.user!.userId, req.body);
    sendSuccess(res, update, "Update created successfully", httpStatus.CREATED);
  }
);

export const updateUpdate: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const update = await updateService.updateUpdate(req.params.id as string, req.body);
    sendSuccess(res, update, "Update saved successfully");
  }
);

export const deleteUpdate: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    await updateService.deleteUpdate(req.params.id as string);
    sendSuccess(res, null, "Update deleted successfully");
  }
);
