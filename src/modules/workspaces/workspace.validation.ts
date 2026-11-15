import { z } from "zod";

const workspaceRoles = ["admin", "member", "viewer", "editor"] as const;

export const createWorkspaceSchema = {
  body: z.object({
    name: z.string().min(1, "Name is required").max(200),
    slug: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    logoUrl: z.string().optional(),
  }),
};

export const updateWorkspaceSchema = {
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    slug: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    logoUrl: z.string().optional(),
    settings: z.object({
      visibility: z.enum(["private", "workspace", "public"]).optional(),
      defaultMemberRole: z.enum(workspaceRoles).optional(),
      allowMemberInvites: z.boolean().optional(),
      requireInviteApproval: z.boolean().optional(),
    }).optional(),
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

export const setActiveWorkspaceSchema = {
  body: z.object({
    workspaceId: z.string().min(1, "Workspace ID is required"),
  }),
};

export const addMemberSchema = {
  body: z.object({
    userId: z.string().min(1, "User ID is required"),
    role: z.enum(workspaceRoles),
    canEditAllForms: z.boolean().optional(),
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
    role: z.enum(workspaceRoles),
    canEditAllForms: z.boolean().optional(),
  }),
  params: z.object({
    workspaceId: z.string().min(1, "Workspace ID is required"),
    memberId: z.string().min(1, "Member ID is required"),
  }),
};

export const inviteMemberSchema = {
  body: z.object({
    email: z.string().email("Valid email is required"),
    role: z.enum(workspaceRoles),
    preAssignedFormIds: z.array(z.string()).optional(),
    canEditAllForms: z.boolean().optional(),
  }),
  params: z.object({
    workspaceId: z.string().min(1, "Workspace ID is required"),
  }),
};

export const invitationIdParamSchema = {
  params: z.object({
    workspaceId: z.string().min(1, "Workspace ID is required"),
    invitationId: z.string().min(1, "Invitation ID is required"),
  }),
};

export const tokenParamSchema = {
  params: z.object({
    token: z.string().min(1, "Token is required"),
  }),
};