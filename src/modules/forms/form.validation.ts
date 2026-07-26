import { z } from "zod";

export const createFormSchema = {
  body: z.object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().max(2000).optional(),
  }),
};

export const updateFormSchema = {
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
  }),
};

export const formIdParamSchema = {
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
  }),
};

export const updateFormSettingsSchema = {
  body: z.object({
    oneQuestionAtATime: z.boolean().optional(),
    showProgressBar: z.boolean().optional(),
    allowMultipleSubmissions: z.boolean().optional(),
    requireLogin: z.boolean().optional(),
    collectIP: z.boolean().optional(),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
  }),
};

export const updateFormThemeSchema = {
  body: z.object({
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color format").optional(),
    backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color format").optional(),
    textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color format").optional(),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
  }),
};

export const updateFormShareSchema = {
  body: z.object({
    isPublic: z.boolean().optional(),
    password: z.string().optional(),
    expiresAt: z.string().optional(),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
  }),
};