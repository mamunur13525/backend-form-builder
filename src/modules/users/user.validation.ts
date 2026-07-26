import { z } from "zod";

export const updateProfileSchema = {
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    avatarUrl: z.string().url().optional(),
  }),
};

export const updateUserSchema = {
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    role: z.enum(["admin", "editor", "viewer"]).optional(),
    isActive: z.boolean().optional(),
  }),
};

export const updateRoleSchema = {
  body: z.object({
    role: z.enum(["admin", "editor", "viewer"]),
  }),
};

export const updateStatusSchema = {
  body: z.object({
    isActive: z.boolean(),
  }),
};

export const userIdParamSchema = {
  params: z.object({
    id: z.string().min(1, "User ID is required"),
  }),
};