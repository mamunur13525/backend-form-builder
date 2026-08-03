import { z } from "zod";

export const responseIdParamSchema = {
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
    responseId: z.string().min(1, "Response ID is required"),
  }),
};

export const updateResponseSchema = {
  body: z.object({
    answers: z
      .array(
        z.object({
          fieldKey: z.string().min(1),
          label: z.string(),
          type: z.string().min(1),
          value: z.any(),
        })
      )
      .optional(),
    metadata: z
      .object({
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
        referrer: z.string().optional(),
      })
      .optional(),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
    responseId: z.string().min(1, "Response ID is required"),
  }),
};

export const formIdParamSchema = {
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
  }),
};