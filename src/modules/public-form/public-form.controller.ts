import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import * as publicFormService from "./public-form.service";

export const getPublicForm: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const form = await publicFormService.getPublicForm(req.params.slug as string);
  sendSuccess(res, form, "Form retrieved successfully");
});

export const getFormSchema: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const schema = await publicFormService.getFormSchema(req.params.slug as string);
  sendSuccess(res, schema, "Form schema retrieved successfully");
});

export const getFormTheme: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const theme = await publicFormService.getFormTheme(req.params.slug as string);
  sendSuccess(res, theme, "Form theme retrieved successfully");
});

export const getFormPreview: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const preview = await publicFormService.getFormPreview(req.params.slug as string);
  sendSuccess(res, preview, "Form preview retrieved successfully");
});

export const submitForm: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await publicFormService.submitForm(
    req.params.slug as string,
    req.body,
    { ip: req.ip, userAgent: req.headers["user-agent"], referrer: req.headers["referer"] }
  );
  sendSuccess(res, result, "Form submitted successfully");
});

export const saveDraft: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await publicFormService.saveDraft(req.params.slug as string, req.body);
  sendSuccess(res, result, "Draft saved successfully");
});

export const getSubmitStatus: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const status = await publicFormService.getSubmitStatus(
    req.params.slug as string,
    req.params.submissionId as string
  );
  sendSuccess(res, status, "Submission status retrieved successfully");
});