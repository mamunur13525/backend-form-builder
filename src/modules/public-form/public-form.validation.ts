import { z } from "zod";

const answerSchema = z
  .object({
    pageKey: z.string().optional(),
    blockKey: z.string().optional(),
    questionKey: z.string().optional(),
    label: z.string().optional(),
    title: z.string().optional(),
    type: z.string().min(1),
    value: z.any(),
  })
  .refine((a) => Boolean(a.pageKey || a.blockKey || a.questionKey), {
    message: "Either pageKey, blockKey, or questionKey is required",
  });

export const submitFormSchema = {
  body: z.object({
    answers: z.array(answerSchema),
    sessionId: z.string().optional(),
  }),
  params: z.object({
    slug: z.string().min(1, "Slug is required"),
  }),
};

export const saveDraftSchema = {
  body: z.object({
    answers: z.array(answerSchema),
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

export const paymentSessionSchema = {
  body: z.object({
    pageKey: z.string().min(1, "pageKey is required"),
    email: z.string().email().max(300).optional(),
    respondentSessionId: z.string().max(200).optional(),
  }),
  params: z.object({
    slug: z.string().min(1, "Slug is required"),
  }),
};

export const verifyPaymentSessionSchema = {
  params: z.object({
    slug: z.string().min(1, "Slug is required"),
    sessionId: z.string().min(1, "Session ID is required"),
  }),
  query: z.object({
    pageKey: z.string().min(1, "pageKey is required"),
  }),
};