import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import { getPaginationParams } from "../../utils/pagination";
import * as formService from "./form.service";

export const createForm: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const form = await formService.createForm(req.user!.userId, req.body);
  sendSuccess(res, form, "Form created successfully", httpStatus.CREATED);
});

export const getAllForms: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { skip, limit, sort } = getPaginationParams(req.query as any);
  const result = await formService.getAllForms(req.user!.userId, skip, limit, sort);
  sendSuccess(res, result.forms, "Forms retrieved successfully", httpStatus.OK);
});

export const getFormById: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const form = await formService.getFormById(req.params.formId as string);
  sendSuccess(res, form, "Form retrieved successfully");
});

export const updateForm: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const form = await formService.updateForm(req.params.formId as string, req.body);
  sendSuccess(res, form, "Form updated successfully");
});

export const deleteForm: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await formService.deleteForm(req.params.formId as string);
  sendSuccess(res, null, "Form deleted successfully");
});

export const duplicateForm: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const form = await formService.duplicateForm(req.user!.userId, req.params.formId as string);
  sendSuccess(res, form, "Form duplicated successfully", httpStatus.CREATED);
});

export const archiveForm: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const form = await formService.archiveForm(req.params.formId as string);
  sendSuccess(res, form, "Form archived successfully");
});

export const restoreForm: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const form = await formService.restoreForm(req.params.formId as string);
  sendSuccess(res, form, "Form restored successfully");
});

export const publishForm: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const form = await formService.publishForm(req.params.formId as string);
  sendSuccess(res, form, "Form published successfully");
});

export const unpublishForm: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const form = await formService.unpublishForm(req.params.formId as string);
  sendSuccess(res, form, "Form unpublished successfully");
});

export const cancelForm: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const form = await formService.cancelForm(req.params.formId as string);
  sendSuccess(res, form, "Form cancelled successfully");
});

export const discardDraft: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const form = await formService.discardDraft(req.params.formId as string);
  sendSuccess(res, form, "Draft discarded successfully");
});

export const getFormVersions: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const versions = await formService.getFormVersions(req.params.formId as string);
  sendSuccess(res, versions, "Form versions retrieved successfully");
});

export const getFormSlug: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await formService.getFormSlug(req.params.formId as string);
  sendSuccess(res, result, "Form slug retrieved successfully");
});

export const updateFormSettings: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const form = await formService.updateFormSettings(req.params.formId as string, req.body);
  sendSuccess(res, form, "Form settings updated successfully");
});

export const updateFormTheme: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const form = await formService.updateFormTheme(req.params.formId as string, req.body);
  sendSuccess(res, form, "Form theme updated successfully");
});

export const updateFormShare: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const share = await formService.updateFormShare(req.params.formId as string, req.body);
  sendSuccess(res, share, "Form share settings updated successfully");
});