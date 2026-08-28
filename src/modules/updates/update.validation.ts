import { z } from "zod";
import { UPDATE_COVERS } from "../../models/Update";

const textRunSchema = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  link: z.string().optional(),
  code: z.boolean().optional(),
});

const blockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("paragraph"),
    runs: z.array(textRunSchema),
  }),
  z.object({
    type: z.literal("readmore"),
    url: z.string(),
    label: z.string(),
  }),
]);

const coverSchema = z.enum(UPDATE_COVERS);

export const createUpdateSchema = {
  body: z.object({
    title: z.string().min(1, "Title is required").max(300),
    date: z.string().datetime().optional(),
    tags: z.array(z.string()).max(10).optional(),
    cover: coverSchema.optional(),
    excerpt: z.string().max(2000).optional(),
    content: z.array(blockSchema).optional(),
  }),
};

export const updateUpdateSchema = {
  body: z.object({
    title: z.string().min(1).max(300).optional(),
    date: z.string().datetime().optional(),
    tags: z.array(z.string()).max(10).optional(),
    cover: coverSchema.nullable().optional(),
    excerpt: z.string().max(2000).optional(),
    content: z.array(blockSchema).optional(),
  }),
  params: z.object({
    id: z.string().min(1, "Update ID is required"),
  }),
};

export const updateSlugParamSchema = {
  params: z.object({
    slug: z.string().min(1, "Slug is required"),
  }),
};

export const updateIdParamSchema = {
  params: z.object({
    id: z.string().min(1, "Update ID is required"),
  }),
};
