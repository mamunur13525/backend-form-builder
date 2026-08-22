import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import * as pageService from "./page.service";

export const createPage: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await pageService.createPage(req.params.formId as string, req.body);
  sendSuccess(res, result, "Page created successfully", httpStatus.CREATED);
});

export const getPages: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const pages = await pageService.getPagesByFormId(req.params.formId as string);
  sendSuccess(res, pages, "Pages retrieved successfully");
});

export const getPageById: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = await pageService.getPageById(req.params.formId as string, req.params.pageId as string);
  sendSuccess(res, page, "Page retrieved successfully");
});

export const updatePage: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await pageService.updatePage(req.params.formId as string, req.params.pageId as string, req.body);
  sendSuccess(res, result, "Page updated successfully");
});

export const deletePage: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await pageService.deletePage(req.params.formId as string, req.params.pageId as string);
  sendSuccess(res, result, "Page deleted successfully");
});

export const reorderPages: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await pageService.reorderPages(req.params.formId as string, req.body);
  sendSuccess(res, result, "Pages reordered successfully");
});

export const duplicatePage: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await pageService.duplicatePage(req.params.formId as string, req.params.pageId as string);
  sendSuccess(res, result, "Page duplicated successfully", httpStatus.CREATED);
});

export const updatePageLogic: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await pageService.updatePageLogic(req.params.formId as string, req.params.pageId as string, req.body);
  sendSuccess(res, result, "Page logic updated successfully");
});

export const deletePageLogic: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await pageService.deletePageLogic(req.params.formId as string, req.params.pageId as string);
  sendSuccess(res, result, "Page logic deleted successfully");
});
