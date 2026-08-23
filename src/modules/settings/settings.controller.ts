import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import * as settingsService from "./settings.service";

export const getSettings: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await settingsService.getSettings(req.params.formId as string);
    sendSuccess(res, result, "Form settings retrieved successfully");
  }
);

export const updateGeneralSettings: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await settingsService.updateGeneralSettings(req.params.formId as string, req.body);
    sendSuccess(res, result, "General settings updated successfully");
  }
);

export const updateEmailSettings: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await settingsService.updateEmailSettings(req.params.formId as string, req.body);
    sendSuccess(res, result, "Email settings updated successfully");
  }
);

export const updateAccessSettings: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await settingsService.updateAccessSettings(req.params.formId as string, req.body);
    sendSuccess(res, result, "Access settings updated successfully");
  }
);

export const updateHiddenFields: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await settingsService.updateHiddenFields(req.params.formId as string, req.body);
    sendSuccess(res, result, "Hidden fields updated successfully");
  }
);

export const updateVariables: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await settingsService.updateVariables(req.params.formId as string, req.body);
    sendSuccess(res, result, "Variables updated successfully");
  }
);