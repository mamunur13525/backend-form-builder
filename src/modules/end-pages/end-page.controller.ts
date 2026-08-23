import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import * as endPageService from "./end-page.service";

export const createEndPage: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await endPageService.createEndPage(req.params.formId as string, req.body);
  sendSuccess(res, result, "End page created successfully", httpStatus.CREATED);
});

export const getEndPages: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const endPages = await endPageService.getEndPagesByFormId(req.params.formId as string);
  sendSuccess(res, endPages, "End pages retrieved successfully");
});

export const getEndPageById: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const endPage = await endPageService.getEndPageById(req.params.formId as string, req.params.endPageId as string);
  sendSuccess(res, endPage, "End page retrieved successfully");
});

export const updateEndPage: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await endPageService.updateEndPage(req.params.formId as string, req.params.endPageId as string, req.body);
  sendSuccess(res, result, "End page updated successfully");
});

export const deleteEndPage: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await endPageService.deleteEndPage(req.params.formId as string, req.params.endPageId as string);
  sendSuccess(res, result, "End page deleted successfully");
});

export const reorderEndPages: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await endPageService.reorderEndPages(req.params.formId as string, req.body);
  sendSuccess(res, result, "End pages reordered successfully");
});

export const duplicateEndPage: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await endPageService.duplicateEndPage(req.params.formId as string, req.params.endPageId as string);
  sendSuccess(res, result, "End page duplicated successfully", httpStatus.CREATED);
});
