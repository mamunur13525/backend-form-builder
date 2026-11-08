import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import * as blockRepo from "./block.repository";
import { buildPageSettings } from "../pages/page.settings";
import { displayOnlyPageTypes, PageType } from "../../constants/pageTypes";
import {
  CreateBlockBody,
  UpdateBlockBody,
  ReorderBlocksBody,
} from "./block.types";

const resolveRequired = (type: string, required?: boolean): boolean =>
  displayOnlyPageTypes.includes(type as PageType) ? false : Boolean(required);

export const createBlock = async (
  formId: string,
  data: CreateBlockBody,
  pageIdParam?: string
): Promise<any> => {
  const pageId = pageIdParam || data.pageId;
  const blockType = data.type || "shortText";

  const result = await blockRepo.createBlock(formId, {
    ...data,
    pageId,
    type: blockType,
    required: resolveRequired(blockType, data.required),
    settings: buildPageSettings(blockType, data.settings),
  });

  return {
    block: result.block,
    page: result.page,
    hasUnpublishedChanges: result.hasUnpublishedChanges,
  };
};

export const getBlocks = async (
  formId: string,
  pageId?: string
): Promise<any[]> => {
  return blockRepo.findBlocks(formId, pageId);
};

export const getBlockById = async (
  formId: string,
  blockId: string,
  pageId?: string
): Promise<any> => {
  const found = await blockRepo.findBlockById(formId, blockId, pageId);
  if (!found) {
    throw new ApiError(httpStatus.NOT_FOUND, "Block not found");
  }
  return found.block;
};

export const updateBlock = async (
  formId: string,
  blockId: string,
  data: UpdateBlockBody,
  pageId?: string
): Promise<any> => {
  const found = await blockRepo.findBlockById(formId, blockId, pageId);
  if (!found) {
    throw new ApiError(httpStatus.NOT_FOUND, "Block not found");
  }

  const existingBlock = found.block;
  const payload: Record<string, any> = { ...data };
  const nextType = data.type || existingBlock.type;

  if (data.settings !== undefined || (data.type && data.type !== existingBlock.type)) {
    payload.settings = buildPageSettings(nextType, data.settings ?? existingBlock.settings);
  }

  if (data.required !== undefined || data.type) {
    payload.required = resolveRequired(nextType, data.required ?? existingBlock.required);
  }

  if (data.coverImage === null) {
    payload.coverImage = undefined;
  }

  const result = await blockRepo.updateBlock(formId, blockId, payload, pageId);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Block not found");
  }

  return {
    block: result.block,
    hasUnpublishedChanges: result.hasUnpublishedChanges,
  };
};

export const deleteBlock = async (
  formId: string,
  blockId: string,
  pageId?: string
): Promise<{ hasUnpublishedChanges: boolean }> => {
  const found = await blockRepo.findBlockById(formId, blockId, pageId);
  if (!found) {
    throw new ApiError(httpStatus.NOT_FOUND, "Block not found");
  }

  return blockRepo.deleteBlock(formId, blockId, pageId);
};

export const reorderBlocks = async (
  formId: string,
  data: ReorderBlocksBody,
  pageIdParam?: string
): Promise<{ hasUnpublishedChanges: boolean }> => {
  const pageId = pageIdParam || data.pageId;
  return blockRepo.reorderBlocks(formId, data.blockIds, pageId);
};