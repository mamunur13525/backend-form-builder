import { WorkspaceRole, WorkspaceVisibility } from "../../models/Workspace";
import { InvitationStatus } from "../../models/WorkspaceInvitation";

export interface CreateWorkspaceBody {
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
}

export interface UpdateWorkspaceBody {
  name?: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  settings?: {
    visibility?: WorkspaceVisibility;
    defaultMemberRole?: WorkspaceRole;
    allowMemberInvites?: boolean;
    requireInviteApproval?: boolean;
  };
}

export interface AddMemberBody {
  userId: string;
  role: WorkspaceRole;
  canEditAllForms?: boolean;
}

export interface UpdateMemberRoleBody {
  role: WorkspaceRole;
  canEditAllForms?: boolean;
}

export interface InviteMemberBody {
  email: string;
  role: WorkspaceRole;
  preAssignedFormIds?: string[];
  canEditAllForms?: boolean;
}

export interface WorkspaceUserSummary {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

export type WorkspacePermission =
  | "workspace:view"
  | "workspace:update"
  | "workspace:delete"
  | "settings:update"
  | "member:view"
  | "member:invite"
  | "member:remove"
  | "member:role-change"
  | "invitation:manage"
  | "ownership:transfer"
  | "activity:view"
  | "form:view"
  | "form:create"
  | "form:update"
  | "form:publish"
  | "form:delete"
  | "response:view"
  | "response:manage";

export interface WorkspaceResponse {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  logoUrl: string;
  description: string;
  owner: WorkspaceUserSummary | null;
  settings: {
    visibility: WorkspaceVisibility;
    defaultMemberRole: WorkspaceRole;
    allowMemberInvites: boolean;
    requireInviteApproval: boolean;
  };
  memberCount: number;
  pendingInvitationCount: number;
  currentUserRole: WorkspaceRole | null;
  permissions: WorkspacePermission[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface WorkspaceMemberResponse {
  id: string;
  workspaceId: string;
  status: "active" | "invited";
  role: WorkspaceRole;
  canEditAllForms?: boolean;
  email: string;
  user: WorkspaceUserSummary | null;
  invitedBy: WorkspaceUserSummary | null;
  joinedAt: Date | string | null;
  invitedAt: Date | string | null;
  expiresAt: Date | string | null;
  isOwner: boolean;
}

export interface WorkspaceInvitationResponse {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  status: InvitationStatus;
  preAssignedFormIds?: string[];
  canEditAllForms?: boolean;
  invitedBy: WorkspaceUserSummary | null;
  expiresAt: Date | string;
  isExpired: boolean;
  resendCount: number;
  lastSentAt: Date | string;
  createdAt: Date | string;
  inviteUrl?: string;
  token?: string;
  workspace?: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string;
    memberCount: number;
  } | null;
}