/// <reference types="jest" />
import { buildPublicFormSettings } from "../modules/public-form/public-form.service";
import { normalizeFormSettings } from "../models/Form";

/**
 * The public form endpoints must expose only the settings a respondent-facing
 * client needs (booleans + `general` + `variables`), while still returning a
 * complete object even when the stored published-version settings are
 * undefined, legacy, or a Mongoose sub-document. Admin-only groups
 * (`emailSettings`, `access`, `hiddenFields`) must be stripped.
 */
describe("public form settings payload", () => {
  it("returns defaults for an empty/undefined published-version settings", () => {
    const settings = buildPublicFormSettings(undefined);

    expect(settings).toEqual({
      oneQuestionAtATime: true,
      showProgressBar: true,
      allowMultipleSubmissions: true,
      requireLogin: false,
      general: expect.objectContaining({ show_progress_bar: true }),
      variables: expect.any(Array),
    });
  });

  it("keeps `variables` always present with default score/price", () => {
    const settings = buildPublicFormSettings({});

    const names = settings.variables.map((v: any) => v.name);
    expect(names).toContain("score");
    expect(names).toContain("price");

    // Custom variables stored on the published version flow through
    const withCustom = buildPublicFormSettings({
      variables: [{ name: "discount", type: "number", value: 20 }],
    });
    expect(withCustom.variables.map((v: any) => v.name)).toEqual(
      expect.arrayContaining(["discount", "score", "price"])
    );
  });

  it("merges partial stored values over the defaults", () => {
    const settings = buildPublicFormSettings({
      oneQuestionAtATime: false,
      showProgressBar: false,
      general: { show_powered_by_company_name: false },
    });

    expect(settings.oneQuestionAtATime).toBe(false);
    expect(settings.showProgressBar).toBe(false);
    expect(settings.allowMultipleSubmissions).toBe(true); // untouched default
    expect(settings.general.show_powered_by_company_name).toBe(false);
  });

  it("strips admin-only settings groups", () => {
    const settings = buildPublicFormSettings({
      emailSettings: { receive_email_notification: true },
      access: { close_form: true },
      hiddenFields: { enabled: true, fields: [{ key: "utm_source", value: "x" }] },
    }) as Record<string, unknown>;

    expect(settings).not.toHaveProperty("emailSettings");
    expect(settings).not.toHaveProperty("access");
    expect(settings).not.toHaveProperty("hiddenFields");
    expect(settings).not.toHaveProperty("collectIP");
  });

  describe("normalizeFormSettings", () => {
    it("returns complete defaults even for legacy/undefined stored settings", () => {
      const full = normalizeFormSettings(undefined);

      expect(full).toMatchObject({
        oneQuestionAtATime: true,
        showProgressBar: true,
        allowMultipleSubmissions: true,
        requireLogin: false,
        collectIP: false,
      });
      expect(full.general).toBeDefined();
      expect(full.access).toBeDefined();
      expect(full.emailSettings).toBeDefined();
      expect(full.hiddenFields).toBeDefined();
      expect(full.variables.length).toBeGreaterThanOrEqual(2);
    });
  });
});