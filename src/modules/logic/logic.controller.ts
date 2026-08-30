import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import * as logicService from "./logic.service";

export const createLogic: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const logic = await logicService.createLogic(req.params.formId as string, req.body);
  sendSuccess(res, logic, "Logic created successfully", httpStatus.CREATED);
});

export const getLogics: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const logics = await logicService.getLogicsByFormId(req.params.formId as string);
  sendSuccess(res, logics, "Logics retrieved successfully");
});

export const updateLogic: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const logic = await logicService.updateLogic(req.params.formId as string, req.params.logicId as string, req.body);
  sendSuccess(res, logic, "Logic updated successfully");
});

export const deleteLogic: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await logicService.deleteLogic(req.params.formId as string, req.params.logicId as string);
  sendSuccess(res, null, "Logic deleted successfully");
});

export const replaceLogic: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const rules = await logicService.replaceAllLogic(req.params.formId as string, req.body);
  sendSuccess(res, rules, "Logic rules replaced successfully");
});