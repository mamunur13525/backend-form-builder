import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import * as publicFormService from "./public-form.service";

export const getPublicForm = asyncHandler(async (req: Request, res: Response) => {
  const form = await publicFormService.getPublicForm(req.params.slug as string);
  sendSuccess(res, form, "Form retrieved successfully");
});

export const getFormSchema = asyncHandler(async (req: Request, res: Response) => {
  const schema = await publicFormService.getFormSchema(req.params.slug as string);
  sendSuccess(res, schema, "Form schema retrieved successfully");
});

export const getFormTheme = asyncHandler(async (req: Request, res: Response) => {
  const theme = await publicFormService.getFormTheme(req.params.slug as string);
  sendSuccess(res, theme, "Form theme retrieved successfully");
});

export const getFormPreview = asyncHandler(async (req: Request, res: Response) => {
  const preview = await publicFormService.getFormPreview(req.params.slug as string);
  sendSuccess(res, preview, "Form preview retrieved successfully");
});

export const submitForm = asyncHandler(async (req: Request, res: Response) => {
  const result = await publicFormService.submitForm(
    req.params.slug as string,
    req.body,
    { ip: req.ip, userAgent: req.headers["user-agent"], referrer: req.headers["referer"] }
  );
  sendSuccess(res, result, "Form submitted successfully");
});

export const saveDraft = asyncHandler(async (req: Request, res: Response) => {
  const result = await publicFormService.saveDraft(req.params.slug as string, req.body);
  sendSuccess(res, result, "Draft saved successfully");
});

export const getSubmitStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = await publicFormService.getSubmitStatus(
    req.params.slug as string,
    req.params.submissionId as string
  );
  sendSuccess(res, status, "Submission status retrieved successfully");
});