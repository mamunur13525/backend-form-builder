import { z } from "zod";
import {
  contentAlignments,
  cornerRadii,
  fontSizes,
  HEX_COLOR_PATTERN,
  isAssetUrl,
  MAX_ASSET_URL_LENGTH,
  MAX_FONT_FAMILY_LENGTH,
  themeFontSources,
  THEME_BRIGHTNESS_MAX,
  THEME_BRIGHTNESS_MIN,
} from "../../constants/theme";

export const createFormSchema = {
  body: z.object({
    title: z.string().min(1, "Title is required").max(200),
  }),
};

export const updateFormSchema = {
  body: z.object({
    title: z.string().min(1).max(200).optional(),
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

const hexColor = z
  .string()
  .regex(HEX_COLOR_PATTERN, "Invalid color format, expected #rrggbb");

/** Accepts ImageKit/absolute URLs and the uploads module's relative paths. */
const assetUrl = z
  .string()
  .max(MAX_ASSET_URL_LENGTH)
  .refine(isAssetUrl, { message: "Must be an absolute http(s) URL or a relative path" });

const themeBackgroundImageSchema = z
  .object({
    url: assetUrl.optional(),
    fileId: z.string().max(100).optional(),
    alt: z.string().max(300).optional(),
    brightness: z
      .number()
      .int()
      .min(THEME_BRIGHTNESS_MIN)
      .max(THEME_BRIGHTNESS_MAX)
      .optional(),
    tile: z.boolean().optional(),
  })
  .strict();

const themeFontSchema = z
  .object({
    family: z.string().min(1).max(MAX_FONT_FAMILY_LENGTH).optional(),
    source: z.enum(themeFontSources).optional(),
    url: z.union([z.literal(""), assetUrl]).optional(),
  })
  .strict()
  .refine((v) => v.source !== "custom" || Boolean(v.url), {
    message: "url is required when source is 'custom'",
    path: ["url"],
  })
  .refine((v) => v.source !== "custom" || Boolean(v.family), {
    message: "family is required when source is 'custom'",
    path: ["family"],
  });

export const updateFormThemeSchema = {
  body: z
    .object({
      primaryColor: hexColor.optional(),
      backgroundColor: hexColor.optional(),
      textColor: hexColor.optional(),
      questionColor: hexColor.optional(),
      answerColor: hexColor.optional(),
      buttonColor: hexColor.optional(),
      buttonTextColor: hexColor.optional(),
      alignment: z.enum(contentAlignments).optional(),
      fontSize: z.enum(fontSizes).optional(),
      roundCorners: z.enum(cornerRadii).optional(),
      // Explicit null clears the background image.
      backgroundImage: themeBackgroundImageSchema.nullish(),
      font: themeFontSchema.optional(),
    })
    .strict()
    .refine(
      (v) =>
        // Brightness and tile only apply on top of an image, so reject them
        // unless this same request also supplies the url.
        !v.backgroundImage ||
        (v.backgroundImage.brightness === undefined && v.backgroundImage.tile === undefined) ||
        Boolean(v.backgroundImage.url),
      {
        message: "backgroundImage.url is required to set brightness or tile",
        path: ["backgroundImage", "url"],
      }
    ),
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