import mongoose, { Schema, Document } from "mongoose";
import { WorkspaceRole } from "./Workspace";

export type InvitationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "revoked";

export interface IWorkspaceInvitation extends Document {
  workspaceId: mongoose.Types.ObjectId;
  email: string;
  role: WorkspaceRole;
  preAssignedFormIds: mongoose.Types.ObjectId[];
  canEditAllForms: boolean;
  token: string;
  invitedBy: mongoose.Types.ObjectId;
  status: InvitationStatus;
  expiresAt: Date;
  resendCount: number;
  lastSentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceInvitationSchema = new Schema<IWorkspaceInvitation>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ["admin", "member", "viewer"], default: "member" },
    preAssignedFormIds: [{ type: Schema.Types.ObjectId, ref: "Form", default: [] }],
    canEditAllForms: { type: Boolean, default: false },
    token: { type: String, required: true, unique: true, index: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "expired", "revoked"],
      default: "pending",
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    resendCount: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const WorkspaceInvitation = mongoose.model<IWorkspaceInvitation>(
  "WorkspaceInvitation",
  workspaceInvitationSchema
);
