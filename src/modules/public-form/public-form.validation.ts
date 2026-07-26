import { z } from "zod";

export const submitFormSchema = {
  body: z.object({
    answers: z.array(
      z.object({
        fieldKey: z.string().min(1),
        label: z.string().min(1),
        type: z.string().min(1),
        value: z.any(),
      })
    ),
    sessionId: z.string().optional(),
  }),
  params: z.object({
    slug: z.string().min(1, "Slug is required"),
  }),
};

export const saveDraftSchema = {
  body: z.object({
    answers: z.array(
      z.object({
        fieldKey: z.string().min(1),
        label: z.string().min(1),
        type: z.string().min(1),
        value: z.any(),
      })
    ),
    sessionId: z.string().optional(),
  }),
  params: z.object({
    slug: z.string().min(1, "Slug is required"),
  }),
};

export const slugParamSchema = {
  params: z.object({
    slug: z.string().min(1, "Slug is required"),
  }),
};

export const submissionIdParamSchema = {
  params: z.object({
    slug: z.string().min(1, "Slug is required"),
    submissionId: z.string().min(1, "Submission ID is required"),
  }),
};