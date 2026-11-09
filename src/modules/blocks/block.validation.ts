import { z } from "zod";
import { pageTypes } from "../../constants/pageTypes";

const pageTypeEnum = z.enum(pageTypes);

const optionSchema = z.object({
  label: z.string().optional(),
  value: z.string().optional(),
});

const coverImageSchema = z.object({
  url: z.string().max(2000),
  fileId: z.string().max(100).optional(),
  alt: z.string().max(300).optional(),
  layout: z.enum(["top", "bottom", "left", "right"]).optional(),
});

const appearanceSchema = z.object({
  width: z.enum(["full", "half"]).optional(),
  icon: z.string().optional(),
  submitButtonText: z.string().optional(),
  submitButtonColor: z.string().optional(),
});

export const createBlockSchema = {
  body: z.object({
    pageId: z.string().optional(),
    title: z.string().max(500).optional(),
    description: z.string().max(1000).optional(),
    label: z.string().max(500).optional(),
    helperText: z.string().max(1000).optional(),
    type: pageTypeEnum.optional().default("shortText"),
    placeholder: z.string().max(200).optional(),
    required: z.boolean().optional(),
    coverImage: coverImageSchema.nullish(),
    options: z.array(optionSchema).optional(),
    validation: z.record(z.string(), z.any()).optional(),
    settings: z.record(z.string(), z.any()).optional(),
    appearance: appearanceSchema.optional(),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
    pageId: z.string().optional(),
  }),
};

export const updateBlockSchema = {
  body: z.object({
    title: z.string().max(500).optional(),
    description: z.string().max(1000).optional(),
    label: z.string().max(500).optional(),
    helperText: z.string().max(1000).optional(),
    type: pageTypeEnum.optional(),
    placeholder: z.string().max(200).optional(),
    required: z.boolean().optional(),
    coverImage: coverImageSchema.nullish(),
    options: z.array(optionSchema).optional(),
    validation: z.record(z.string(), z.any()).optional(),
    settings: z.record(z.string(), z.any()).optional(),
    appearance: appearanceSchema.optional(),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
    blockId: z.string().min(1, "Block ID is required"),
    pageId: z.string().optional(),
  }),
};

export const reorderBlocksSchema = {
  body: z.object({
    pageId: z.string().optional(),
    blockIds: z.array(z.string()).min(1, "At least one block ID is required"),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
    pageId: z.string().optional(),
  }),
};

export const blockIdParamSchema = {
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
    blockId: z.string().min(1, "Block ID is required"),
    pageId: z.string().optional(),
  }),
};