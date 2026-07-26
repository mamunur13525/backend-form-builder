export const formStatus = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export type FormStatus = (typeof formStatus)[keyof typeof formStatus];

export const userStatus = {
  ACTIVE: true,
  INACTIVE: false,
} as const;