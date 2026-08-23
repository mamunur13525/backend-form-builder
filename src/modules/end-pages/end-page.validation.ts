import { z } from "zod";
import { contentAlignments } from "../../constants/theme";
import { embedProviders } from "../../constants/pageTypes";

const coverImageSchema = z.object({
  url: z.string().max(2000),
  fileId: z.string().max(100).optional(),
  alt: z.string().max(300).optional(),
});

const embedSchema = z.object({
  url: z.string().max(2000).optional().default(""),
  provider: z.enum(embedProviders).optional(),
  title: z.string().max(500).optional().default(""),
});

const buttonSchema = z.object({
  text: z.string().max(200).optional().default(""),
  link: z.string().max(2000).optional().default(""),
});

const redirectSchema = z.object({
  isRedirect: z.boolean().optional().default(false),
  link: z.string().max(2000).optional().default(""),
});

const socialShareMediaSchema = z.object({
  facebook: z.boolean().optional().default(false),
  twitter: z.boolean().optional().default(false),
  linkedin: z.boolean().optional().default(false),
  whatsapp: z.boolean().optional().default(false),
});

export const createEndPageSchema = {
  body: z.object({
    title: z.string().max(500).optional(),
    helperText: z.string().max(1000).optional(),
    paragraph: z.string().max(1000).optional(),
    coverImage: coverImageSchema.nullable().optional(),
    embed: embedSchema.optional(),
    alignment: z.enum(contentAlignments).optional(),
    button: buttonSchema.optional(),
    redirect: redirectSchema.optional(),
    showConfetti: z.boolean().optional(),
    socialShareButtons: z.boolean().optional(),
    socialShareMessage: z.string().max(1000).optional(),
    socialShareMedia: socialShareMediaSchema.optional(),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
  }),
};

export const updateEndPageSchema = {
  body: z.object({
    title: z.string().max(500).optional(),
    helperText: z.string().max(1000).optional(),
    paragraph: z.string().max(1000).optional(),
    coverImage: coverImageSchema.nullable().optional(),
    embed: embedSchema.optional(),
    alignment: z.enum(contentAlignments).optional(),
    button: buttonSchema.optional(),
    redirect: redirectSchema.optional(),
    showConfetti: z.boolean().optional(),
    socialShareButtons: z.boolean().optional(),
    socialShareMessage: z.string().max(1000).optional(),
    socialShareMedia: socialShareMediaSchema.optional(),
    order: z.number().int().positive().optional(),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
    endPageId: z.string().min(1, "End Page ID is required"),
  }),
};

export const endPageIdParamSchema = {
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
    endPageId: z.string().min(1, "End Page ID is required"),
  }),
};

export const reorderEndPagesSchema = {
  body: z.object({
    endPageIds: z.array(z.string()).min(1, "At least one end page ID is required"),
  }),
  params: z.object({
    formId: z.string().min(1, "Form ID is required"),
  }),
};
