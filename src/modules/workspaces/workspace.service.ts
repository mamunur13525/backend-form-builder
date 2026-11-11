import crypto from "crypto";
import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { generateUniqueSlug } from "../../utils/slug";
import * as workspaceRepo from "./workspace.repository";
import {
  CreateWorkspaceBody,
  UpdateWorkspaceBody,
  InviteMemberBody,
  UpdateMemberRoleBody,
  WorkspacePermission,
  WorkspaceResponse,
  WorkspaceMemberResponse,
  WorkspaceInvitationResponse,
} from "./workspace.types";
import { User } from "../../models/User";
import { Form } from "../../models/Form";
import { WorkspaceRole } from "../../models/Workspace";
import { env } from "../../config/env";

export const computeWorkspacePermissions = (role: WorkspaceRole | null): WorkspacePermission[] => {
  if (role === "admin") {
    return [
      "workspace:view",
      "workspace:update",
      "workspace:delete",
      "settings:update",
      "member:view",
      "member:invite",
      "member:remove",
      "member:role-change",
      "invitation:manage",
      "ownership:transfer",
      "activity:view",
      "form:view",
      "form:create",
      "form:update",
      "form:publish",
      "form:delete",
      "response:view",
      "response:manage",
    ];
  }
  if (role === "member") {
    return [
      "workspace:view",
      "member:view",
      "activity:view",
      "form:view",
      "form:create",
      "form:update",
      "form:publish",
      "response:view",
    ];
  }
  if (role === "viewer") {
    return [
      "workspace:view",
      "member:view",
      "activity:view",
      "form:view",
      "response:view",
    ];
  }
  return [];
};

export const toWorkspaceResponse = async (
  workspace: any,
  currentUserId?: string
): Promise<WorkspaceResponse> => {
  const wsId = (workspace._id || workspace.id).toString();
  const members = Array.isArray(workspace.members) ? workspace.members : [];
  const currentMember = currentUserId
    ? members.find((m: any) => (m.userId?._id || m.userId || "").toString() === currentUserId.toString())
    : null;

  const currentUserRole: WorkspaceRole | null = currentMember
    ? (currentMember.role as WorkspaceRole)
    : (workspace.createdBy?._id || workspace.createdBy || "").toString() === currentUserId?.toString()
      ? "admin"
      : null;

  const permissions = computeWorkspacePermissions(currentUserRole);
  const pendingCount = await workspaceRepo.countPendingInvitations(wsId);

  const ownerUser = workspace.createdBy?.name
    ? {
        id: (workspace.createdBy._id || workspace.createdBy.id).toString(),
        name: workspace.createdBy.name,
        email: workspace.createdBy.email,
        avatarUrl: workspace.createdBy.avatarUrl || "",
      }
    : null;

  return {
    id: wsId,
    _id: wsId,
    name: workspace.name,
    slug: workspace.slug || wsId,
    logoUrl: workspace.logoUrl || "",
    description: workspace.description || "",
    owner: ownerUser,
    settings: workspace.settings || {
      visibility: "private",
      defaultMemberRole: "member",
      allowMemberInvites: true,
      requireInviteApproval: false,
    },
    memberCount: members.length || 1,
    pendingInvitationCount: pendingCount,
    currentUserRole,
    permissions,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
};

/* -------------------------------------------------------------------------- */
/* Workspaces CRUD & Active Workspace                                         */
/* -------------------------------------------------------------------------- */

export const createWorkspace = async (
  userId: string,
  data: CreateWorkspaceBody
): Promise<WorkspaceResponse> => {
  const slug = await generateUniqueSlug(
    data.slug || data.name,
    workspaceRepo.checkSlugExists
  );

  const workspace = await workspaceRepo.createWorkspace({
    name: data.name,
    slug,
    description: data.description,
    logoUrl: data.logoUrl,
    createdBy: userId,
  });

  await User.findByIdAndUpdate(userId, { activeWorkspaceId: workspace._id });
  return toWorkspaceResponse(workspace, userId);
};

export const getWorkspaces = async (userId: string): Promise<WorkspaceResponse[]> => {
  const workspaces = await workspaceRepo.findWorkspacesByUser(userId);
  return Promise.all(workspaces.map((ws) => toWorkspaceResponse(ws, userId)));
};

export const getWorkspaceById = async (
  workspaceId: string,
  userId?: string
): Promise<any> => {
  const workspace = await workspaceRepo.findWorkspaceById(workspaceId);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");

  if (userId) {
    const isMember = (workspace.members || []).some(
      (m: any) => (m.userId?._id || m.userId || "").toString() === userId.toString()
    );
    if (!isMember && (workspace.createdBy?._id || workspace.createdBy || "").toString() !== userId.toString()) {
      throw new ApiError(httpStatus.FORBIDDEN, "Not a member of this workspace");
    }
  }

  const baseResponse = await toWorkspaceResponse(workspace, userId);
  const members = await getMembers(workspaceId, userId);

  return {
    ...baseResponse,
    members,
  };
};

export const getWorkspaceBySlug = async (slug: string, userId?: string): Promise<any> => {
  const workspace = await workspaceRepo.findWorkspaceBySlug(slug);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");
  const wsId = (workspace._id || (workspace as any).id).toString();
  return getWorkspaceById(wsId, userId);
};

export const checkSlugAvailability = async (slug: string) => {
  const exists = await workspaceRepo.checkSlugExists(slug);
  let suggestion = slug;
  if (exists) {
    let counter = 1;
    while (await workspaceRepo.checkSlugExists(`${slug}-${counter}`)) {
      counter++;
    }
    suggestion = `${slug}-${counter}`;
  }
  return {
    slug,
    available: !exists,
    suggestion,
  };
};

export const updateWorkspace = async (
  workspaceId: string,
  userId: string,
  data: UpdateWorkspaceBody
): Promise<WorkspaceResponse> => {
  const workspace = await workspaceRepo.findWorkspaceById(workspaceId);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");

  const currentMember = (workspace.members || []).find(
    (m: any) => (m.userId?._id || m.userId || "").toString() === userId.toString()
  );
  if (!currentMember || currentMember.role !== "admin") {
    throw new ApiError(httpStatus.FORBIDDEN, "Only workspace admins can update workspace settings");
  }

  const updated = await workspaceRepo.updateWorkspace(workspaceId, data);
  return toWorkspaceResponse(updated, userId);
};

export const deleteWorkspace = async (
  workspaceId: string,
  userId: string
): Promise<{ workspaceId: string }> => {
  const workspace = await workspaceRepo.findWorkspaceById(workspaceId);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");

  const currentMember = (workspace.members || []).find(
    (m: any) => (m.userId?._id || m.userId || "").toString() === userId.toString()
  );
  if (!currentMember || currentMember.role !== "admin") {
    throw new ApiError(httpStatus.FORBIDDEN, "Only workspace admins can delete a workspace");
  }

  await workspaceRepo.deleteWorkspace(workspaceId);

  // If user's active workspace was this one, clear it
  await User.updateMany({ activeWorkspaceId: workspaceId }, { activeWorkspaceId: null });

  return { workspaceId };
};

export const getActiveWorkspace = async (
  userId: string
): Promise<{ workspaceId: string | null }> => {
  const user = await User.findById(userId);
  if (user?.activeWorkspaceId) {
    const ws = await workspaceRepo.findWorkspaceById(user.activeWorkspaceId.toString());
    if (ws) {
      return { workspaceId: user.activeWorkspaceId.toString() };
    }
  }

  const workspaces = await workspaceRepo.findWorkspacesByUser(userId);
  if (workspaces.length > 0) {
    const defaultWsId = ((workspaces[0] as any)._id || (workspaces[0] as any).id).toString();
    await User.findByIdAndUpdate(userId, { activeWorkspaceId: defaultWsId });
    return { workspaceId: defaultWsId };
  }

  return { workspaceId: null };
};

export const setActiveWorkspace = async (
  userId: string,
  workspaceId: string
): Promise<{ workspaceId: string }> => {
  const workspace = await workspaceRepo.findWorkspaceById(workspaceId);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");

  const isMember = (workspace.members || []).some(
    (m: any) => (m.userId?._id || m.userId || "").toString() === userId.toString()
  );
  if (!isMember && (workspace as any).createdBy?._id?.toString() !== userId.toString()) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not a member of this workspace");
  }

  await User.findByIdAndUpdate(userId, { activeWorkspaceId: workspaceId });
  return { workspaceId };
};

/* -------------------------------------------------------------------------- */
/* Members Management & RBAC Protection                                       */
/* -------------------------------------------------------------------------- */

export const getMembers = async (
  workspaceId: string,
  callerUserId?: string
): Promise<WorkspaceMemberResponse[]> => {
  const workspace = await workspaceRepo.findWorkspaceById(workspaceId);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");

  const activeMembers: WorkspaceMemberResponse[] = (workspace.members || []).map((m: any) => {
    const userObj = m.userId || {};
    const userIdStr = (userObj._id || userObj.id || m.userId || "").toString();
    const isOwner = (workspace.createdBy?._id || workspace.createdBy || "").toString() === userIdStr;

    return {
      id: (m._id || m.id || userIdStr).toString(),
      workspaceId,
      status: "active",
      role: (m.role || "viewer") as WorkspaceRole,
      canEditAllForms: !!m.canEditAllForms,
      email: userObj.email || "",
      user: userObj.name
        ? {
            id: userIdStr,
            name: userObj.name,
            email: userObj.email,
            avatarUrl: userObj.avatarUrl || "",
          }
        : null,
      invitedBy: null,
      joinedAt: m.joinedAt || workspace.createdAt,
      invitedAt: null,
      expiresAt: null,
      isOwner,
    };
  });

  // Also include pending invitations for members list
  const pendingInvites = await workspaceRepo.findInvitationsByWorkspace(workspaceId, "pending");
  const invitedMembers: WorkspaceMemberResponse[] = pendingInvites.map((inv: any) => ({
    id: (inv._id || inv.id).toString(),
    workspaceId,
    status: "invited",
    role: inv.role as WorkspaceRole,
    canEditAllForms: !!inv.canEditAllForms,
    email: inv.email,
    user: null,
    invitedBy: inv.invitedBy?.name
      ? {
          id: (inv.invitedBy._id || inv.invitedBy.id).toString(),
          name: inv.invitedBy.name,
          email: inv.invitedBy.email,
          avatarUrl: inv.invitedBy.avatarUrl || "",
        }
      : null,
    joinedAt: null,
    invitedAt: inv.createdAt,
    expiresAt: inv.expiresAt,
    isOwner: false,
  }));

  return [...activeMembers, ...invitedMembers];
};

export const updateMemberRole = async (
  workspaceId: string,
  memberId: string,
  callerUserId: string,
  data: UpdateMemberRoleBody
): Promise<WorkspaceMemberResponse[]> => {
  const workspace = await workspaceRepo.findWorkspaceById(workspaceId);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");

  const callerMember = (workspace.members || []).find(
    (m: any) => (m.userId?._id || m.userId || "").toString() === callerUserId.toString()
  );
  if (!callerMember || callerMember.role !== "admin") {
    throw new ApiError(httpStatus.FORBIDDEN, "Only workspace admins can update member roles");
  }

  const targetMember = (workspace.members || []).find(
    (m: any) =>
      (m._id || m.id || "").toString() === memberId.toString() ||
      (m.userId?._id || m.userId || "").toString() === memberId.toString()
  );
  if (!targetMember) throw new ApiError(httpStatus.NOT_FOUND, "Member not found in workspace");

  const targetUserId = (targetMember.userId?._id || targetMember.userId || "").toString();

  // Edge case: Last Admin Protection
  if (targetMember.role === "admin" && data.role !== "admin") {
    const adminCount = (workspace.members || []).filter(
      (m: any) =>
        m.role === "admin" &&
        (m.userId?._id || m.userId || "").toString() !== targetUserId
    ).length;
    if (adminCount === 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Cannot demote the sole admin of the workspace. Promote another member to admin first."
      );
    }
  }

  await workspaceRepo.updateMember(workspaceId, memberId, data.role, data.canEditAllForms);

  // Edge case: If member demoted to viewer, strip user from allowedEditors across all workspace forms
  if (data.role === "viewer") {
    await Form.updateMany(
      { workspaceId },
      { $pull: { allowedEditors: targetUserId } }
    );
  }

  return getMembers(workspaceId, callerUserId);
};

export const removeMember = async (
  workspaceId: string,
  memberId: string,
  callerUserId: string
): Promise<WorkspaceMemberResponse[]> => {
  const workspace = await workspaceRepo.findWorkspaceById(workspaceId);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");

  const targetMember = (workspace.members || []).find(
    (m: any) =>
      (m._id || m.id || "").toString() === memberId.toString() ||
      (m.userId?._id || m.userId || "").toString() === memberId.toString()
  );
  if (!targetMember) throw new ApiError(httpStatus.NOT_FOUND, "Member not found in workspace");

  const targetUserId = (targetMember.userId?._id || targetMember.userId || "").toString();
  const isSelf = targetUserId === callerUserId.toString();

  const callerMember = (workspace.members || []).find(
    (m: any) => (m.userId?._id || m.userId || "").toString() === callerUserId.toString()
  );
  if (!isSelf && (!callerMember || callerMember.role !== "admin")) {
    throw new ApiError(httpStatus.FORBIDDEN, "Only workspace admins can remove members");
  }

  // Edge case: Last Admin Protection
  if (targetMember.role === "admin") {
    const otherAdmins = (workspace.members || []).filter(
      (m: any) =>
        m.role === "admin" &&
        (m.userId?._id || m.userId || "").toString() !== targetUserId
    );
    if (otherAdmins.length === 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Cannot remove the sole admin of the workspace. Promote another member to admin first."
      );
    }
  }

  await workspaceRepo.removeMember(workspaceId, memberId);

  // Strip removed member from allowedEditors across all workspace forms
  await Form.updateMany(
    { workspaceId },
    { $pull: { allowedEditors: targetUserId } }
  );

  // If user removed themselves, clear activeWorkspaceId if it was this one
  if (isSelf) {
    await User.findByIdAndUpdate(callerUserId, { activeWorkspaceId: null });
  }

  return getMembers(workspaceId, callerUserId);
};

/* -------------------------------------------------------------------------- */
/* Invitations Pipeline                                                       */
/* -------------------------------------------------------------------------- */

const buildInviteUrl = (token: string): string => {
  const base = (env.frontendUrl || "http://localhost:5173").replace(/\/+$/, "");
  return `${base}/invite/${token}`;
};

export const inviteMember = async (
  workspaceId: string,
  callerUserId: string,
  data: InviteMemberBody
): Promise<WorkspaceInvitationResponse> => {
  const workspace = await workspaceRepo.findWorkspaceById(workspaceId);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");

  const callerMember = (workspace.members || []).find(
    (m: any) => (m.userId?._id || m.userId || "").toString() === callerUserId.toString()
  );
  if (!callerMember || callerMember.role !== "admin") {
    throw new ApiError(httpStatus.FORBIDDEN, "Only workspace admins can invite new members");
  }

  const normalizedEmail = data.email.toLowerCase().trim();

  // Edge case: Already a member check
  const alreadyMember = (workspace.members || []).some(
    (m: any) => (m.userId?.email || "").toLowerCase() === normalizedEmail
  );
  if (alreadyMember) {
    throw new ApiError(httpStatus.BAD_REQUEST, "This user is already a member of the workspace");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Edge case: Duplicate Pending Invitations check
  const existingPending = await workspaceRepo.findPendingInvitation(workspaceId, normalizedEmail);
  let invitationDoc: any;

  if (existingPending) {
    existingPending.token = token;
    existingPending.role = data.role;
    existingPending.canEditAllForms = !!data.canEditAllForms;
    if (data.preAssignedFormIds) {
      existingPending.preAssignedFormIds = data.preAssignedFormIds as any;
    }
    existingPending.expiresAt = expiresAt;
    existingPending.lastSentAt = new Date();
    existingPending.resendCount = (existingPending.resendCount || 0) + 1;
    invitationDoc = await existingPending.save();
  } else {
    invitationDoc = await workspaceRepo.createInvitation({
      workspaceId,
      email: normalizedEmail,
      role: data.role,
      preAssignedFormIds: data.preAssignedFormIds,
      canEditAllForms: data.canEditAllForms,
      token,
      invitedBy: callerUserId,
      expiresAt,
    });
  }

  const inviteUrl = buildInviteUrl(token);

  // Transactional email dispatch / log
  console.log(`[Workspace Invitation] Sent invite to ${normalizedEmail} for workspace "${workspace.name}". Link: ${inviteUrl}`);

  return {
    id: invitationDoc._id.toString(),
    workspaceId,
    email: invitationDoc.email,
    role: invitationDoc.role,
    status: invitationDoc.status,
    preAssignedFormIds: (invitationDoc.preAssignedFormIds || []).map((id: any) => id.toString()),
    canEditAllForms: !!invitationDoc.canEditAllForms,
    invitedBy: {
      id: callerUserId,
      name: (callerMember.userId as any)?.name || "Admin",
      email: (callerMember.userId as any)?.email || "",
      avatarUrl: (callerMember.userId as any)?.avatarUrl || "",
    },
    expiresAt: invitationDoc.expiresAt,
    isExpired: false,
    resendCount: invitationDoc.resendCount || 0,
    lastSentAt: invitationDoc.lastSentAt,
    createdAt: invitationDoc.createdAt,
    inviteUrl,
    token,
  };
};

export const getInvitations = async (
  workspaceId: string,
  callerUserId: string
): Promise<WorkspaceInvitationResponse[]> => {
  const workspace = await workspaceRepo.findWorkspaceById(workspaceId);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");

  const callerMember = (workspace.members || []).find(
    (m: any) => (m.userId?._id || m.userId || "").toString() === callerUserId.toString()
  );
  if (!callerMember || callerMember.role !== "admin") {
    throw new ApiError(httpStatus.FORBIDDEN, "Only workspace admins can view pending invitations");
  }

  const invitations = await workspaceRepo.findInvitationsByWorkspace(workspaceId, "pending");
  return invitations.map((inv: any) => ({
    id: inv._id.toString(),
    workspaceId,
    email: inv.email,
    role: inv.role,
    status: inv.status,
    preAssignedFormIds: (inv.preAssignedFormIds || []).map((id: any) => id.toString()),
    canEditAllForms: !!inv.canEditAllForms,
    invitedBy: inv.invitedBy
      ? {
          id: (inv.invitedBy._id || inv.invitedBy.id).toString(),
          name: inv.invitedBy.name,
          email: inv.invitedBy.email,
          avatarUrl: inv.invitedBy.avatarUrl || "",
        }
      : null,
    expiresAt: inv.expiresAt,
    isExpired: new Date(inv.expiresAt).getTime() < Date.now(),
    resendCount: inv.resendCount || 0,
    lastSentAt: inv.lastSentAt,
    createdAt: inv.createdAt,
    inviteUrl: buildInviteUrl(inv.token),
    token: inv.token,
  }));
};

export const resendInvitation = async (
  workspaceId: string,
  invitationId: string,
  callerUserId: string
): Promise<WorkspaceInvitationResponse> => {
  const workspace = await workspaceRepo.findWorkspaceById(workspaceId);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");

  const callerMember = (workspace.members || []).find(
    (m: any) => (m.userId?._id || m.userId || "").toString() === callerUserId.toString()
  );
  if (!callerMember || callerMember.role !== "admin") {
    throw new ApiError(httpStatus.FORBIDDEN, "Only workspace admins can resend invitations");
  }

  const invitation = await workspaceRepo.findInvitationById(invitationId);
  if (!invitation || invitation.workspaceId.toString() !== workspaceId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invitation not found");
  }

  const freshToken = crypto.randomBytes(32).toString("hex");
  const freshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  invitation.token = freshToken;
  invitation.expiresAt = freshExpiresAt;
  invitation.status = "pending";
  invitation.resendCount = (invitation.resendCount || 0) + 1;
  invitation.lastSentAt = new Date();
  await invitation.save();

  const inviteUrl = buildInviteUrl(freshToken);

  console.log(`[Workspace Invitation] Resent invite to ${invitation.email}. New link: ${inviteUrl}`);

  return {
    id: invitation._id.toString(),
    workspaceId,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    preAssignedFormIds: (invitation.preAssignedFormIds || []).map((id: any) => id.toString()),
    canEditAllForms: !!invitation.canEditAllForms,
    invitedBy: {
      id: callerUserId,
      name: (callerMember.userId as any)?.name || "Admin",
      email: (callerMember.userId as any)?.email || "",
      avatarUrl: (callerMember.userId as any)?.avatarUrl || "",
    },
    expiresAt: invitation.expiresAt,
    isExpired: false,
    resendCount: invitation.resendCount,
    lastSentAt: invitation.lastSentAt,
    createdAt: invitation.createdAt,
    inviteUrl,
    token: freshToken,
  };
};

export const cancelInvitation = async (
  workspaceId: string,
  invitationId: string,
  callerUserId: string
): Promise<{ success: boolean; invitationId: string }> => {
  const workspace = await workspaceRepo.findWorkspaceById(workspaceId);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");

  const callerMember = (workspace.members || []).find(
    (m: any) => (m.userId?._id || m.userId || "").toString() === callerUserId.toString()
  );
  if (!callerMember || callerMember.role !== "admin") {
    throw new ApiError(httpStatus.FORBIDDEN, "Only workspace admins can cancel invitations");
  }

  const invitation = await workspaceRepo.findInvitationById(invitationId);
  if (!invitation || invitation.workspaceId.toString() !== workspaceId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invitation not found");
  }

  invitation.status = "revoked";
  await invitation.save();

  return { success: true, invitationId };
};

export const getIncomingInvitations = async (
  userEmail: string
): Promise<WorkspaceInvitationResponse[]> => {
  const invitations = await workspaceRepo.findInvitationsByEmail(userEmail);
  return invitations.map((inv: any) => ({
    id: inv._id.toString(),
    workspaceId: inv.workspaceId?._id?.toString() || inv.workspaceId?.toString(),
    email: inv.email,
    role: inv.role,
    status: inv.status,
    preAssignedFormIds: (inv.preAssignedFormIds || []).map((id: any) => id.toString()),
    canEditAllForms: !!inv.canEditAllForms,
    invitedBy: inv.invitedBy
      ? {
          id: (inv.invitedBy._id || inv.invitedBy.id).toString(),
          name: inv.invitedBy.name,
          email: inv.invitedBy.email,
          avatarUrl: inv.invitedBy.avatarUrl || "",
        }
      : null,
    expiresAt: inv.expiresAt,
    isExpired: new Date(inv.expiresAt).getTime() < Date.now(),
    resendCount: inv.resendCount || 0,
    lastSentAt: inv.lastSentAt,
    createdAt: inv.createdAt,
    token: inv.token,
    workspace: inv.workspaceId
      ? {
          id: (inv.workspaceId._id || inv.workspaceId.id).toString(),
          name: inv.workspaceId.name,
          slug: inv.workspaceId.slug,
          logoUrl: inv.workspaceId.logoUrl || "",
          memberCount: inv.workspaceId.members?.length || 1,
        }
      : null,
  }));
};

export const getInvitationByToken = async (token: string): Promise<WorkspaceInvitationResponse> => {
  const invitation: any = await workspaceRepo.findInvitationByToken(token);
  if (!invitation) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invalid invitation link or token");
  }

  const isExpired = new Date(invitation.expiresAt).getTime() < Date.now();

  return {
    id: invitation._id.toString(),
    workspaceId: invitation.workspaceId?._id?.toString() || invitation.workspaceId?.toString(),
    email: invitation.email,
    role: invitation.role,
    status: isExpired && invitation.status === "pending" ? "expired" : invitation.status,
    preAssignedFormIds: (invitation.preAssignedFormIds || []).map((id: any) => id.toString()),
    canEditAllForms: !!invitation.canEditAllForms,
    invitedBy: invitation.invitedBy
      ? {
          id: (invitation.invitedBy._id || invitation.invitedBy.id).toString(),
          name: invitation.invitedBy.name,
          email: invitation.invitedBy.email,
          avatarUrl: invitation.invitedBy.avatarUrl || "",
        }
      : null,
    expiresAt: invitation.expiresAt,
    isExpired,
    resendCount: invitation.resendCount || 0,
    lastSentAt: invitation.lastSentAt,
    createdAt: invitation.createdAt,
    token: invitation.token,
    workspace: invitation.workspaceId
      ? {
          id: (invitation.workspaceId._id || invitation.workspaceId.id).toString(),
          name: invitation.workspaceId.name,
          slug: invitation.workspaceId.slug,
          logoUrl: invitation.workspaceId.logoUrl || "",
          memberCount: invitation.workspaceId.members?.length || 1,
        }
      : null,
  };
};

export const acceptInvitation = async (
  token: string,
  userId: string,
  userEmail: string
): Promise<WorkspaceResponse> => {
  const invitation: any = await workspaceRepo.findInvitationByToken(token);
  if (!invitation) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invalid invitation token");
  }

  // Single-use token enforcement
  if (invitation.status !== "pending") {
    throw new ApiError(httpStatus.BAD_REQUEST, `This invitation has already been ${invitation.status}`);
  }

  if (new Date(invitation.expiresAt).getTime() < Date.now()) {
    invitation.status = "expired";
    await invitation.save();
    throw new ApiError(httpStatus.BAD_REQUEST, "This invitation link has expired");
  }

  // Email mismatch verification
  if (userEmail.toLowerCase().trim() !== invitation.email.toLowerCase().trim()) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `This invitation was sent to ${invitation.email}. You are currently signed in as ${userEmail}. Please switch accounts to accept this invitation.`
    );
  }

  const workspaceId = invitation.workspaceId?._id?.toString() || invitation.workspaceId?.toString();
  const workspace = await workspaceRepo.findWorkspaceById(workspaceId);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace no longer exists");

  // Check if user is already a member
  const alreadyMember = (workspace.members || []).some(
    (m: any) => (m.userId?._id || m.userId || "").toString() === userId.toString()
  );

  if (!alreadyMember) {
    await workspaceRepo.addMember(
      workspaceId,
      userId,
      invitation.role,
      invitation.canEditAllForms || invitation.role === "admin"
    );
  }

  // If role is member and preAssignedFormIds were specified, add user to allowedEditors on those forms
  if (invitation.role === "member" && invitation.preAssignedFormIds?.length > 0) {
    await Form.updateMany(
      { _id: { $in: invitation.preAssignedFormIds }, workspaceId },
      { $addToSet: { allowedEditors: userId } }
    );
  }

  // Mark invitation accepted
  invitation.status = "accepted";
  await invitation.save();

  // Switch active workspace to this one
  await User.findByIdAndUpdate(userId, { activeWorkspaceId: workspaceId });

  const refreshed = await workspaceRepo.findWorkspaceById(workspaceId);
  return toWorkspaceResponse(refreshed, userId);
};

export const declineInvitation = async (
  token: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  const invitation: any = await workspaceRepo.findInvitationByToken(token);
  if (!invitation) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invalid invitation token");
  }

  if (invitation.status !== "pending") {
    throw new ApiError(httpStatus.BAD_REQUEST, `This invitation has already been ${invitation.status}`);
  }

  invitation.status = "declined";
  await invitation.save();

  return { success: true, message: "Invitation declined successfully" };
};