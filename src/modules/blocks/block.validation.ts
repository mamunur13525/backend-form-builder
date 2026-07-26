import { z } from "zod";

export const createBlockSchema = {
  body: z.object({
    title: z.string().max(200).optional(),
    description: z.string().max(2000).optional(),
    type: z.string().optional(),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
  }),
};

export const updateBlockSchema = {
  body: z.object({
    title: z.string().max(200).optional(),
    description: z.string().max(2000).optional(),
    type: z.string().optional(),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
    blockId: z.string().min(1, "Block ID is required"),
  }),
};

export const reorderBlocksSchema = {
  body: z.object({
    blockIds: z.array(z.string()).min(1, "At least one block ID is required"),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
  }),
};

export const blockIdParamSchema = {
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
    blockId: z.string().min(1, "Block ID is required"),
  }),
};