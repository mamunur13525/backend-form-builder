import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import { getPaginationParams } from "../../utils/pagination";
import * as formService from "./form.service";

export const createForm = asyncHandler(async (req: Request, res: Response) => {
  const form = await formService.createForm(req.user!.userId, req.body);
  sendSuccess(res, form, "Form created successfully", httpStatus.CREATED);
});

export const getAllForms = asyncHandler(async (req: Request, res: Response) => {
  const { skip, limit, sort } = getPaginationParams(req.query as any);
  const result = await formService.getAllForms(req.user!.userId, skip, limit, sort);
  sendSuccess(res, result.forms, "Forms retrieved successfully", httpStatus.OK);
});

export const getFormById = asyncHandler(async (req: Request, res: Response) => {
  const form = await formService.getFormById(req.params.formId as string);
  sendSuccess(res, form, "Form retrieved successfully");
});

export const updateForm = asyncHandler(async (req: Request, res: Response) => {
  const form = await formService.updateForm(req.params.formId as string, req.body);
  sendSuccess(res, form, "Form updated successfully");
});

export const deleteForm = asyncHandler(async (req: Request, res: Response) => {
  await formService.deleteForm(req.params.formId as string);
  sendSuccess(res, null, "Form deleted successfully");
});

export const duplicateForm = asyncHandler(async (req: Request, res: Response) => {
  const form = await formService.duplicateForm(req.user!.userId, req.params.formId as string);
  sendSuccess(res, form, "Form duplicated successfully", httpStatus.CREATED);
});

export const archiveForm = asyncHandler(async (req: Request, res: Response) => {
  const form = await formService.archiveForm(req.params.formId as string);
  sendSuccess(res, form, "Form archived successfully");
});

export const restoreForm = asyncHandler(async (req: Request, res: Response) => {
  const form = await formService.restoreForm(req.params.formId as string);
  sendSuccess(res, form, "Form restored successfully");
});

export const publishForm = asyncHandler(async (req: Request, res: Response) => {
  const form = await formService.publishForm(req.params.formId as string);
  sendSuccess(res, form, "Form published successfully");
});

export const unpublishForm = asyncHandler(async (req: Request, res: Response) => {
  const form = await formService.unpublishForm(req.params.formId as string);
  sendSuccess(res, form, "Form unpublished successfully");
});

export const discardDraft = asyncHandler(async (req: Request, res: Response) => {
  const form = await formService.discardDraft(req.params.formId as string);
  sendSuccess(res, form, "Draft discarded successfully");
});

export const getFormVersions = asyncHandler(async (req: Request, res: Response) => {
  const versions = await formService.getFormVersions(req.params.formId as string);
  sendSuccess(res, versions, "Form versions retrieved successfully");
});

export const getFormSlug = asyncHandler(async (req: Request, res: Response) => {
  const result = await formService.getFormSlug(req.params.formId as string);
  sendSuccess(res, result, "Form slug retrieved successfully");
});

export const updateFormSettings = asyncHandler(async (req: Request, res: Response) => {
  const form = await formService.updateFormSettings(req.params.formId as string, req.body);
  sendSuccess(res, form, "Form settings updated successfully");
});

export const updateFormTheme = asyncHandler(async (req: Request, res: Response) => {
  const form = await formService.updateFormTheme(req.params.formId as string, req.body);
  sendSuccess(res, form, "Form theme updated successfully");
});

export const updateFormShare = asyncHandler(async (req: Request, res: Response) => {
  const share = await formService.updateFormShare(req.params.formId as string, req.body);
  sendSuccess(res, share, "Form share settings updated successfully");
});