import mongoose, { Schema, Document } from "mongoose";

interface IWorkspace extends Document {
  name: string;
  description: string;
  createdBy: mongoose.Types.ObjectId;
  members: {
    userId: mongoose.Types.ObjectId;
    role: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        role: { type: String, enum: ["admin", "editor", "viewer"], default: "viewer" },
      },
    ],
  },
  { timestamps: true }
);

const Workspace = mongoose.model<IWorkspace>("Workspace", workspaceSchema);

export const createWorkspace = async (data: {
  name: string;
  description: string;
  createdBy: string;
}): Promise<IWorkspace> => {
  return Workspace.create({
    ...data,
    members: [{ userId: data.createdBy, role: "admin" }],
  });
};

export const findWorkspacesByUser = async (userId: string): Promise<IWorkspace[]> => {
  return Workspace.find({ "members.userId": userId }).lean();
};

export const findWorkspaceById = async (workspaceId: string): Promise<IWorkspace | null> => {
  return Workspace.findById(workspaceId).populate("members.userId", "name email").lean();
};

export const updateWorkspace = async (
  workspaceId: string,
  data: Record<string, any>
): Promise<IWorkspace | null> => {
  return Workspace.findByIdAndUpdate(workspaceId, data, { new: true }).lean();
};

export const deleteWorkspace = async (workspaceId: string): Promise<IWorkspace | null> => {
  return Workspace.findByIdAndDelete(workspaceId);
};

export const addMember = async (
  workspaceId: string,
  userId: string,
  role: string
): Promise<IWorkspace | null> => {
  return Workspace.findByIdAndUpdate(
    workspaceId,
    { $push: { members: { userId, role } } },
    { new: true }
  ).lean();
};

export const updateMember = async (
  workspaceId: string,
  memberId: string,
  role: string
): Promise<IWorkspace | null> => {
  return Workspace.findOneAndUpdate(
    { _id: workspaceId, "members._id": memberId },
    { $set: { "members.$.role": role } },
    { new: true }
  ).lean();
};

export const removeMember = async (
  workspaceId: string,
  memberId: string
): Promise<IWorkspace | null> => {
  return Workspace.findByIdAndUpdate(
    workspaceId,
    { $pull: { members: { _id: memberId } } },
    { new: true }
  ).lean();
};