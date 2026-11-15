import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { getPaginationParams } from "../../utils/pagination";
import * as responseService from "./response.service";

export const getResponses: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { skip, limit, sort } = getPaginationParams(req.query as any);
  const filter: Record<string, any> = {};
  if (req.query.status === "completed") {
    filter.$or = [{ status: "completed" }, { status: { $exists: false } }, { status: null }];
  } else if (req.query.status === "partial") {
    filter.status = "partial";
  }
  const result = await responseService.getResponsesByFormId(
    req.params.formId as string, skip, limit, sort, filter
  );
  sendSuccess(res, result.responses, "Responses retrieved successfully");
});

export const getResponseById: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const response = await responseService.getResponseById(
    req.params.formId as string, req.params.responseId as string
  );
  sendSuccess(res, response, "Response retrieved successfully");
});

export const deleteResponse: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await responseService.deleteResponse(req.params.formId as string, req.params.responseId as string);
  sendSuccess(res, null, "Response deleted successfully");
});

export const updateResponse: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const response = await responseService.updateResponse(
    req.params.formId as string, req.params.responseId as string, req.body
  );
  sendSuccess(res, response, "Response updated successfully");
});

export const exportResponses: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const format = (req.query.format as string) || "json";
  const status = req.query.status as string;
  const result = await responseService.exportResponses(req.params.formId as string, format, status);
  sendSuccess(res, result, "Responses exported successfully");
});

export const getResponseStats: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const stats = await responseService.getResponseStats(req.params.formId as string);
  sendSuccess(res, stats, "Response stats retrieved successfully");
});

export const getResponseSummary: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const summary = await responseService.getResponseSummary(req.params.formId as string);
  sendSuccess(res, summary, "Response summary retrieved successfully");
});

export const markAsRead: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const response = await responseService.markAsRead(req.params.formId as string, req.params.responseId as string);
  sendSuccess(res, response, "Response marked as read");
});

export const markAsUnread: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const response = await responseService.markAsUnread(req.params.formId as string, req.params.responseId as string);
  sendSuccess(res, response, "Response marked as unread");
});

export const starResponse: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const response = await responseService.starResponse(req.params.formId as string, req.params.responseId as string);
  sendSuccess(res, response, "Response starred");
});

export const unstarResponse: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const response = await responseService.unstarResponse(req.params.formId as string, req.params.responseId as string);
  sendSuccess(res, response, "Response unstarred");
});