import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import * as logicService from "./logic.service";

export const createLogic = asyncHandler(async (req: Request, res: Response) => {
  const logic = await logicService.createLogic(req.params.formId as string, req.body);
  sendSuccess(res, logic, "Logic created successfully", httpStatus.CREATED);
});

export const getLogics = asyncHandler(async (req: Request, res: Response) => {
  const logics = await logicService.getLogicsByFormId(req.params.formId as string);
  sendSuccess(res, logics, "Logics retrieved successfully");
});

export const updateLogic = asyncHandler(async (req: Request, res: Response) => {
  const logic = await logicService.updateLogic(req.params.formId as string, req.params.logicId as string, req.body);
  sendSuccess(res, logic, "Logic updated successfully");
});

export const deleteLogic = asyncHandler(async (req: Request, res: Response) => {
  await logicService.deleteLogic(req.params.formId as string, req.params.logicId as string);
  sendSuccess(res, null, "Logic deleted successfully");
});