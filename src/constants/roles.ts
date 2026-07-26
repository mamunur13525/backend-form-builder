export const roles = {
  ADMIN: "admin",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;

export type Role = (typeof roles)[keyof typeof roles];

export const roleHierarchy: Record<Role, number> = {
  [roles.VIEWER]: 1,
  [roles.EDITOR]: 2,
  [roles.ADMIN]: 3,
};