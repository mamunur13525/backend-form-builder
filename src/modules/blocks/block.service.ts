import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import * as blockRepo from "./block.repository";
import { CreateBlockBody, UpdateBlockBody, ReorderBlocksBody } from "./block.types";

export const createBlock = async (formId: string, data: CreateBlockBody): Promise<any> => {
  const order = (await blockRepo.getMaxOrder(formId)) + 1;
  const block = await blockRepo.createBlock({
    formId,
    title: data.title || "",
    type: data.type || "section",
    order,
  });
  return block.toObject();
};

export const getBlocksByFormId = async (formId: string): Promise<any[]> => {
  return blockRepo.findBlocksByFormId(formId);
};

export const updateBlock = async (formId: string, blockId: string, data: UpdateBlockBody): Promise<any> => {
  const block = await blockRepo.findBlockById(formId, blockId);
  if (!block) throw new ApiError(httpStatus.NOT_FOUND, "Block not found");
  const updated = await blockRepo.updateBlock(blockId, data);
  return updated!.toObject();
};

export const deleteBlock = async (formId: string, blockId: string): Promise<void> => {
  const block = await blockRepo.findBlockById(formId, blockId);
  if (!block) throw new ApiError(httpStatus.NOT_FOUND, "Block not found");
  await blockRepo.deleteBlock(blockId);
};

export const reorderBlocks = async (formId: string, data: ReorderBlocksBody): Promise<void> => {
  const updates = data.blockIds.map((blockId, index) => ({ blockId, order: index + 1 }));
  await blockRepo.updateBlockOrders(updates);
};