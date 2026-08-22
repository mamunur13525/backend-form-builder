/**
 * Central registry for the form-level appearance ("theme") settings.
 * Keep this list as the single source of truth: the Mongoose schema, the Zod
 * validators and the default theme are all derived from it.
 *
 * The theme is form-wide — it styles every page of the form. Per-page styling
 * lives in `IFormPage.appearance` and is unrelated.
 */

/** Horizontal alignment applied to all form content (question, answers, button). */
export const contentAlignments = ["left", "center", "right"] as const;

export type ContentAlignment = (typeof contentAlignments)[number];

/** Rendered as three preset buttons in the appearance panel. */
export const fontSizes = ["small", "medium", "large"] as const;

export type FontSize = (typeof fontSizes)[number];

/** Corner radius preset applied to inputs, choice options and buttons. */
export const cornerRadii = ["small", "medium", "large"] as const;

export type CornerRadius = (typeof cornerRadii)[number];

/* -------------------------------------------------------------------------- */
/* Fonts                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * `system`  - a websafe family, no loading required.
 * `google`  - loaded from Google Fonts by `family`.
 * `custom`  - a user-supplied font file; `url` is required.
 */
export const themeFontSources = ["system", "google", "custom"] as const;

export type ThemeFontSource = (typeof themeFontSources)[number];

export interface PresetFont {
  family: string;
  source: Exclude<ThemeFontSource, "custom">;
}

/** Offered in the font picker. Custom uploads are not listed here. */
export const presetFonts: PresetFont[] = [
  { family: "Inter", source: "google" },
  { family: "Roboto", source: "google" },
  { family: "Open Sans", source: "google" },
  { family: "Lato", source: "google" },
  { family: "Montserrat", source: "google" },
  { family: "Poppins", source: "google" },
  { family: "Playfair Display", source: "google" },
  { family: "Merriweather", source: "google" },
  { family: "JetBrains Mono", source: "google" },
  { family: "Arial", source: "system" },
  { family: "Georgia", source: "system" },
  { family: "Times New Roman", source: "system" },
  { family: "Courier New", source: "system" },
  { family: "Verdana", source: "system" },
];

export const MAX_FONT_FAMILY_LENGTH = 100;

/* -------------------------------------------------------------------------- */
/* Background image                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Relative offset from the image's own brightness, so `0` leaves it untouched.
 * Negative values darken it — the usual case, to keep text readable on top.
 * Maps to `filter: brightness(1 + value / 100)`.
 */
export const THEME_BRIGHTNESS_MIN = -100;
export const THEME_BRIGHTNESS_MAX = 100;
export const DEFAULT_THEME_BRIGHTNESS = 0;

export const MAX_ASSET_URL_LENGTH = 2000;

/**
 * Absolute http(s) URLs (e.g. ImageKit) and root-relative paths served by the
 * uploads module (`/api/v1/uploads/<fileId>`) are both accepted.
 */
export const isAssetUrl = (value: string): boolean =>
  value === "" || /^https?:\/\//i.test(value) || value.startsWith("/");

/* -------------------------------------------------------------------------- */
/* Defaults                                                                    */
/* -------------------------------------------------------------------------- */

export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const DEFAULT_PRIMARY_COLOR = "#000000";
export const DEFAULT_BACKGROUND_COLOR = "#ffffff";
export const DEFAULT_TEXT_COLOR = "#111111";
export const DEFAULT_QUESTION_COLOR = "#111111";
export const DEFAULT_ANSWER_COLOR = "#111111";
export const DEFAULT_BUTTON_COLOR = "#000000";
export const DEFAULT_BUTTON_TEXT_COLOR = "#ffffff";

export const DEFAULT_ALIGNMENT: ContentAlignment = "left";
export const DEFAULT_FONT_SIZE: FontSize = "medium";
export const DEFAULT_CORNER_RADIUS: CornerRadius = "medium";

export const DEFAULT_THEME_FONT: PresetFont = { family: "Inter", source: "google" };
