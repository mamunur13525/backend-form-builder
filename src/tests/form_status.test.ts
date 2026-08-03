/// <reference types="jest" />
import {
  closedFormReason,
  closedFormStatuses,
  formStatus,
  formStatusValues,
  isClosedFormStatus,
} from "../constants/status";
import { httpStatus } from "../constants/httpStatus";

describe("form status constants", () => {
  it("exposes the full status set", () => {
    expect(formStatusValues).toEqual([
      "draft",
      "published",
      "unpublished",
      "cancelled",
      "archived",
    ]);
  });

  it("treats only unpublished and cancelled as closed", () => {
    expect(closedFormStatuses).toEqual(["unpublished", "cancelled"]);

    expect(isClosedFormStatus(formStatus.UNPUBLISHED)).toBe(true);
    expect(isClosedFormStatus(formStatus.CANCELLED)).toBe(true);

    expect(isClosedFormStatus(formStatus.DRAFT)).toBe(false);
    expect(isClosedFormStatus(formStatus.PUBLISHED)).toBe(false);
    expect(isClosedFormStatus(formStatus.ARCHIVED)).toBe(false);
    expect(isClosedFormStatus("nonsense")).toBe(false);
  });

  it("maps every closed status to a distinct client-facing reason", () => {
    for (const status of closedFormStatuses) {
      const reason = closedFormReason[status];
      expect(reason.code).toBeTruthy();
      expect(reason.message).toBeTruthy();
    }

    expect(closedFormReason.unpublished.code).toBe("FORM_UNPUBLISHED");
    expect(closedFormReason.cancelled.code).toBe("FORM_CANCELLED");
    expect(closedFormReason.unpublished.code).not.toBe(
      closedFormReason.cancelled.code
    );
  });

  it("defines GONE for closed-form responses", () => {
    expect(httpStatus.GONE).toBe(410);
  });
});
