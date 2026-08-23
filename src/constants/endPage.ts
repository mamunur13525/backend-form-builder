import { env } from "../config/env";

/**
 * Default end-page ("Thank you") content.
 *
 * These defaults are the single source of truth shared by:
 *  - `POST /api/v1/forms` (auto-generated default end page)
 *  - `POST /api/v1/forms/:formId/end-pages` (empty / partial payloads)
 */

/** Main heading shown on the completion screen. */
export const DEFAULT_END_PAGE_TITLE = "Thank you!";

/** Appreciation message shown to the respondent after submission. */
export const DEFAULT_END_PAGE_MESSAGE =
  "Your response has been submitted successfully. We appreciate you taking the time to fill this out.";

/** Label of the primary call-to-action button. */
export const DEFAULT_END_PAGE_BUTTON_TEXT = "Create your own form";

export interface DefaultEndPageContent {
  title: string;
  helperText: string;
  paragraph: string;
  button: {
    text: string;
    link: string;
  };
}

/**
 * Builds the default end-page text content.
 *
 * `link` is resolved at call time so it always reflects the currently
 * configured frontend URL (`env.frontendUrl`).
 */
export const buildDefaultEndPageContent = (): DefaultEndPageContent => ({
  title: DEFAULT_END_PAGE_TITLE,
  helperText: DEFAULT_END_PAGE_MESSAGE,
  paragraph: DEFAULT_END_PAGE_MESSAGE,
  button: {
    text: DEFAULT_END_PAGE_BUTTON_TEXT,
    link: env.frontendUrl,
  },
});