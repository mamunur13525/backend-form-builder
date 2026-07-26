import { z } from "zod";

export const createWorkspaceSchema = {
  body: z.object({
    name: z.string().min(1, "Name is required").max(200),
    description: z.string().max(2000).optional(),
  }),
};

export const updateWorkspaceSchema = {
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
  }),
  params: z.object({
    workspaceId: z.string().min(1, "Workspace ID is required"),
  }),
};

export const workspaceIdParamSchema = {
  params: z.object({
    workspaceId: z.string().min(1, "Workspace ID is required"),
  }),
};

export const addMemberSchema = {
  body: z.object({
    userId: z.string().min(1, "User ID is required"),
    role: z.enum(["admin", "editor", "viewer"]),
  }),
  params: z.object({
    workspaceId: z.string().min(1, "Workspace ID is required"),
  }),
};

export const memberIdParamSchema = {
  params: z.object({
    workspaceId: z.string().min(1, "Workspace ID is required"),
    memberId: z.string().min(1, "Member ID is required"),
  }),
};

export const updateMemberSchema = {
  body: z.object({
    role: z.enum(["admin", "editor", "viewer"]),
  }),
  params: z.object({
    workspaceId: z.string().min(1, "Workspace ID is required"),
    memberId: z.string().min(1, "Member ID is required"),
  }),
};