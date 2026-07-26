import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import * as blockService from "./block.service";

export const createBlock = asyncHandler(async (req: Request, res: Response) => {
  const block = await blockService.createBlock(req.params.formId as string, req.body);
  sendSuccess(res, block, "Block created successfully", httpStatus.CREATED);
});

export const getBlocks = asyncHandler(async (req: Request, res: Response) => {
  const blocks = await blockService.getBlocksByFormId(req.params.formId as string);
  sendSuccess(res, blocks, "Blocks retrieved successfully");
});

export const updateBlock = asyncHandler(async (req: Request, res: Response) => {
  const block = await blockService.updateBlock(req.params.formId as string, req.params.blockId as string, req.body);
  sendSuccess(res, block, "Block updated successfully");
});

export const deleteBlock = asyncHandler(async (req: Request, res: Response) => {
  await blockService.deleteBlock(req.params.formId as string, req.params.blockId as string);
  sendSuccess(res, null, "Block deleted successfully");
});

export const reorderBlocks = asyncHandler(async (req: Request, res: Response) => {
  await blockService.reorderBlocks(req.params.formId as string, req.body);
  sendSuccess(res, null, "Blocks reordered successfully");
});