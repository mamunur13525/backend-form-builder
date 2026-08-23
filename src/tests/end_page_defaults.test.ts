/// <reference types="jest" />
import {
  buildDefaultEndPageContent,
  DEFAULT_END_PAGE_TITLE,
  DEFAULT_END_PAGE_MESSAGE,
  DEFAULT_END_PAGE_BUTTON_TEXT,
} from "../constants/endPage";
import { resolveEndPageDefaults } from "../modules/end-pages/end-page.service";

/**
 * DB-free unit tests for the end-page default content.
 *
 * These cover the exact regression reported against
 * `POST /api/v1/forms/:formId/end-pages` with an empty `{}` payload,
 * which should produce the full "Thank you" end page rather than blank
 * helperText/paragraph.
 */
describe("end page defaults", () => {
  describe("buildDefaultEndPageContent", () => {
    it("returns the full Thank-you message", () => {
      const defaults = buildDefaultEndPageContent();

      expect(defaults.title).toBe("Thank you!");
      expect(defaults.helperText).toBe(DEFAULT_END_PAGE_MESSAGE);
      expect(defaults.paragraph).toBe(DEFAULT_END_PAGE_MESSAGE);
      expect(defaults.button.text).toBe("Create your own form");
      expect(defaults.button.link).toBe(
        process.env.FRONTEND_URL || "http://localhost:5173"
      );
    });

    it("keeps helperText and paragraph in sync", () => {
      const defaults = buildDefaultEndPageContent();
      expect(defaults.paragraph).toBe(defaults.helperText);
    });
  });

  describe("resolveEndPageDefaults", () => {
    const message =
      "Your response has been submitted successfully. We appreciate you taking the time to fill this out.";

    it("fills every field from defaults for an empty payload", () => {
      const resolved = resolveEndPageDefaults({});

      expect(resolved).toEqual({
        title: DEFAULT_END_PAGE_TITLE,
        helperText: message,
        paragraph: message,
        button: {
          text: DEFAULT_END_PAGE_BUTTON_TEXT,
          link: process.env.FRONTEND_URL || "http://localhost:5173",
        },
      });
    });

    it("uses provided values and falls back per-field", () => {
      const resolved = resolveEndPageDefaults({
        title: "Thanks for participating!",
        helperText: "Custom helper",
        button: { text: "Go home", link: "https://example.com" },
      });

      expect(resolved).toEqual({
        title: "Thanks for participating!",
        helperText: "Custom helper",
        paragraph: "Custom helper", // mirrored when only helperText is sent
        button: {
          text: "Go home",
          link: "https://example.com",
        },
      });
    });

    it("mirrors paragraph into helperText when only paragraph is sent", () => {
      expect(resolveEndPageDefaults({ paragraph: "Just the paragraph" })).toEqual({
        title: DEFAULT_END_PAGE_TITLE,
        helperText: "Just the paragraph",
        paragraph: "Just the paragraph",
        button: {
          text: DEFAULT_END_PAGE_BUTTON_TEXT,
          link: process.env.FRONTEND_URL || "http://localhost:5173",
        },
      });
    });

    it("uses defaults for a partially provided button", () => {
      const resolved = resolveEndPageDefaults({ button: { text: "Custom" } });

      expect(resolved.button.text).toBe("Custom");
      expect(resolved.button.link).toBe(process.env.FRONTEND_URL || "http://localhost:5173");
    });
  });
});