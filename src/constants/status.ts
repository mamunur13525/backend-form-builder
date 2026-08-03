export const formStatus = {
  /** Never published. Only the owner can see it. */
  DRAFT: "draft",
  /** Live and accepting responses. */
  PUBLISHED: "published",
  /** Was live, taken down by the owner. Can be published again. */
  UNPUBLISHED: "unpublished",
  /** Was live, permanently closed by the owner. Can be published again. */
  CANCELLED: "cancelled",
  /** Removed from the owner's active list. */
  ARCHIVED: "archived",
} as const;

export type FormStatus = (typeof formStatus)[keyof typeof formStatus];

export const formStatusValues = Object.values(formStatus);

/**
 * Statuses of a form that was published at some point but is no longer
 * accepting responses. Public endpoints answer these with 410 Gone plus a
 * reason, so respondents get a "closed form" screen instead of a 404.
 */
export const closedFormStatuses = [
  formStatus.UNPUBLISHED,
  formStatus.CANCELLED,
] as const;

export type ClosedFormStatus = (typeof closedFormStatuses)[number];

export const isClosedFormStatus = (status: string): status is ClosedFormStatus =>
  (closedFormStatuses as readonly string[]).includes(status);

export const closedFormReason: Record<
  ClosedFormStatus,
  { code: string; message: string }
> = {
  [formStatus.UNPUBLISHED]: {
    code: "FORM_UNPUBLISHED",
    message: "This form is no longer accepting responses",
  },
  [formStatus.CANCELLED]: {
    code: "FORM_CANCELLED",
    message: "This form has been cancelled",
  },
};

export const userStatus = {
  ACTIVE: true,
  INACTIVE: false,
} as const;