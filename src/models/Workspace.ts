import mongoose, { Schema, Document } from "mongoose";

export type WorkspaceRole = "admin" | "member" | "viewer";
export type WorkspaceVisibility = "private" | "workspace" | "public";

export interface IWorkspaceMember {
  _id?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: WorkspaceRole;
  canEditAllForms?: boolean;
  joinedAt: Date;
}

export interface IWorkspaceSettings {
  visibility: WorkspaceVisibility;
  defaultMemberRole: WorkspaceRole;
  allowMemberInvites: boolean;
  requireInviteApproval: boolean;
}

export interface IWorkspace extends Document {
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  createdBy: mongoose.Types.ObjectId;
  members: IWorkspaceMember[];
  settings: IWorkspaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "member", "viewer"], default: "viewer" },
    canEditAllForms: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const workspaceSettingsSchema = new Schema<IWorkspaceSettings>(
  {
    visibility: { type: String, enum: ["private", "workspace", "public"], default: "private" },
    defaultMemberRole: { type: String, enum: ["admin", "member", "viewer"], default: "member" },
    allowMemberInvites: { type: Boolean, default: true },
    requireInviteApproval: { type: Boolean, default: false },
  },
  { _id: false }
);

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [workspaceMemberSchema],
    settings: {
      type: workspaceSettingsSchema,
      default: () => ({
        visibility: "private",
        defaultMemberRole: "member",
        allowMemberInvites: true,
        requireInviteApproval: false,
      }),
    },
  },
  { timestamps: true }
);

export const Workspace = mongoose.model<IWorkspace>("Workspace", workspaceSchema);
