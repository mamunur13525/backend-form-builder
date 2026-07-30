import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import * as fieldService from "./field.service";

export const createField = asyncHandler(async (req: Request, res: Response) => {
  const result = await fieldService.createField(req.params.formId as string, req.body);
  sendSuccess(res, result, "Field created successfully", httpStatus.CREATED);
});

export const getFields = asyncHandler(async (req: Request, res: Response) => {
  const fields = await fieldService.getFieldsByFormId(req.params.formId as string);
  sendSuccess(res, fields, "Fields retrieved successfully");
});

export const getFieldById = asyncHandler(async (req: Request, res: Response) => {
  const field = await fieldService.getFieldById(req.params.formId as string, req.params.fieldId as string);
  sendSuccess(res, field, "Field retrieved successfully");
});

export const updateField = asyncHandler(async (req: Request, res: Response) => {
  const result = await fieldService.updateField(req.params.formId as string, req.params.fieldId as string, req.body);
  sendSuccess(res, result, "Field updated successfully");
});

export const deleteField = asyncHandler(async (req: Request, res: Response) => {
  const result = await fieldService.deleteField(req.params.formId as string, req.params.fieldId as string);
  sendSuccess(res, result, "Field deleted successfully");
});

export const reorderFields = asyncHandler(async (req: Request, res: Response) => {
  const result = await fieldService.reorderFields(req.params.formId as string, req.body);
  sendSuccess(res, result, "Fields reordered successfully");
});

export const duplicateField = asyncHandler(async (req: Request, res: Response) => {
  const result = await fieldService.duplicateField(req.params.formId as string, req.params.fieldId as string);
  sendSuccess(res, result, "Field duplicated successfully", httpStatus.CREATED);
});

export const updateFieldLogic = asyncHandler(async (req: Request, res: Response) => {
  const result = await fieldService.updateFieldLogic(req.params.formId as string, req.params.fieldId as string, req.body);
  sendSuccess(res, result, "Field logic updated successfully");
});

export const deleteFieldLogic = asyncHandler(async (req: Request, res: Response) => {
  const result = await fieldService.deleteFieldLogic(req.params.formId as string, req.params.fieldId as string);
  sendSuccess(res, result, "Field logic deleted successfully");
});
