import mongoose from "mongoose";
import { Workspace, IWorkspace, WorkspaceRole } from "../../models/Workspace";
import { WorkspaceInvitation, IWorkspaceInvitation, InvitationStatus } from "../../models/WorkspaceInvitation";

export const createWorkspace = async (data: {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  createdBy: string;
}): Promise<IWorkspace> => {
  return Workspace.create({
    name: data.name,
    slug: data.slug,
    description: data.description || "",
    logoUrl: data.logoUrl || "",
    createdBy: data.createdBy,
    members: [
      {
        userId: new mongoose.Types.ObjectId(data.createdBy),
        role: "admin",
        canEditAllForms: true,
        joinedAt: new Date(),
      },
    ],
  });
};

export const findWorkspacesByUser = async (userId: string): Promise<IWorkspace[]> => {
  return Workspace.find({ "members.userId": userId })
    .populate("createdBy", "name email avatarUrl")
    .populate("members.userId", "name email avatarUrl")
    .lean();
};

export const findWorkspaceById = async (workspaceId: string): Promise<IWorkspace | null> => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) return null;
  return Workspace.findById(workspaceId)
    .populate("createdBy", "name email avatarUrl")
    .populate("members.userId", "name email avatarUrl")
    .lean();
};

export const findWorkspaceDocById = async (workspaceId: string): Promise<IWorkspace | null> => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) return null;
  return Workspace.findById(workspaceId);
};

export const findWorkspaceBySlug = async (slug: string): Promise<IWorkspace | null> => {
  return Workspace.findOne({ slug })
    .populate("createdBy", "name email avatarUrl")
    .populate("members.userId", "name email avatarUrl")
    .lean();
};

export const checkSlugExists = async (slug: string): Promise<boolean> => {
  const count = await Workspace.countDocuments({ slug });
  return count > 0;
};

export const updateWorkspace = async (
  workspaceId: string,
  data: Record<string, any>
): Promise<IWorkspace | null> => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) return null;
  return Workspace.findByIdAndUpdate(workspaceId, data, { new: true })
    .populate("createdBy", "name email avatarUrl")
    .populate("members.userId", "name email avatarUrl")
    .lean();
};

export const deleteWorkspace = async (workspaceId: string): Promise<IWorkspace | null> => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) return null;
  return Workspace.findByIdAndDelete(workspaceId);
};

export const addMember = async (
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
  canEditAllForms = false
): Promise<IWorkspace | null> => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) return null;
  return Workspace.findByIdAndUpdate(
    workspaceId,
    {
      $push: {
        members: {
          userId: new mongoose.Types.ObjectId(userId),
          role,
          canEditAllForms,
          joinedAt: new Date(),
        },
      },
    },
    { new: true }
  )
    .populate("createdBy", "name email avatarUrl")
    .populate("members.userId", "name email avatarUrl")
    .lean();
};

export const updateMember = async (
  workspaceId: string,
  memberId: string,
  role: WorkspaceRole,
  canEditAllForms?: boolean
): Promise<IWorkspace | null> => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) return null;
  const updateFields: Record<string, any> = {
    "members.$.role": role,
  };
  if (canEditAllForms !== undefined) {
    updateFields["members.$.canEditAllForms"] = canEditAllForms;
  }
  const idObj = mongoose.Types.ObjectId.isValid(memberId) ? new mongoose.Types.ObjectId(memberId) : null;
  return Workspace.findOneAndUpdate(
    {
      _id: workspaceId,
      $or: [{ "members._id": idObj }, { "members.userId": idObj }],
    },
    { $set: updateFields },
    { returnDocument: "after" }
  )
    .populate("createdBy", "name email avatarUrl")
    .populate("members.userId", "name email avatarUrl")
    .lean();
};

export const removeMember = async (
  workspaceId: string,
  memberId: string
): Promise<IWorkspace | null> => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) return null;
  const idObj = mongoose.Types.ObjectId.isValid(memberId) ? new mongoose.Types.ObjectId(memberId) : null;
  return Workspace.findByIdAndUpdate(
    workspaceId,
    {
      $pull: {
        members: {
          $or: [{ _id: idObj }, { userId: idObj }],
        },
      },
    },
    { returnDocument: "after" }
  )
    .populate("createdBy", "name email avatarUrl")
    .populate("members.userId", "name email avatarUrl")
    .lean();
};

/* -------------------------------------------------------------------------- */
/* Workspace Invitations                                                      */
/* -------------------------------------------------------------------------- */

export const createInvitation = async (data: {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  preAssignedFormIds?: string[];
  canEditAllForms?: boolean;
  token: string;
  invitedBy: string;
  expiresAt: Date;
}): Promise<IWorkspaceInvitation> => {
  return WorkspaceInvitation.create({
    workspaceId: new mongoose.Types.ObjectId(data.workspaceId),
    email: data.email.toLowerCase().trim(),
    role: data.role,
    preAssignedFormIds: (data.preAssignedFormIds || []).map((id) => new mongoose.Types.ObjectId(id)),
    canEditAllForms: !!data.canEditAllForms,
    token: data.token,
    invitedBy: new mongoose.Types.ObjectId(data.invitedBy),
    status: "pending",
    expiresAt: data.expiresAt,
    lastSentAt: new Date(),
    resendCount: 0,
  });
};

export const findInvitationByToken = async (
  token: string
): Promise<IWorkspaceInvitation | null> => {
  return WorkspaceInvitation.findOne({ token })
    .populate("workspaceId", "name slug logoUrl members")
    .populate("invitedBy", "name email avatarUrl");
};

export const findInvitationById = async (
  invitationId: string
): Promise<IWorkspaceInvitation | null> => {
  if (!mongoose.Types.ObjectId.isValid(invitationId)) return null;
  return WorkspaceInvitation.findById(invitationId);
};

export const findPendingInvitation = async (
  workspaceId: string,
  email: string
): Promise<IWorkspaceInvitation | null> => {
  return WorkspaceInvitation.findOne({
    workspaceId,
    email: email.toLowerCase().trim(),
    status: "pending",
  });
};

export const updateInvitation = async (
  invitationId: string,
  data: Record<string, any>
): Promise<IWorkspaceInvitation | null> => {
  if (!mongoose.Types.ObjectId.isValid(invitationId)) return null;
  return WorkspaceInvitation.findByIdAndUpdate(invitationId, data, { new: true });
};

export const findInvitationsByWorkspace = async (
  workspaceId: string,
  status: InvitationStatus = "pending"
): Promise<IWorkspaceInvitation[]> => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) return [];
  return WorkspaceInvitation.find({ workspaceId: new mongoose.Types.ObjectId(workspaceId) as any, status })
    .populate("invitedBy", "name email avatarUrl")
    .sort({ createdAt: -1 })
    .lean();
};

export const findInvitationsByEmail = async (
  email: string
): Promise<IWorkspaceInvitation[]> => {
  return WorkspaceInvitation.find({
    email: email.toLowerCase().trim(),
    status: "pending",
    expiresAt: { $gt: new Date() },
  })
    .populate("workspaceId", "name slug logoUrl members")
    .populate("invitedBy", "name email avatarUrl")
    .sort({ createdAt: -1 })
    .lean();
};

export const countPendingInvitations = async (workspaceId: string): Promise<number> => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) return 0;
  return WorkspaceInvitation.countDocuments({
    workspaceId,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });
};