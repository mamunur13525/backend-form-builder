import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import * as workspaceRepo from "./workspace.repository";
import { CreateWorkspaceBody, UpdateWorkspaceBody } from "./workspace.types";

export const createWorkspace = async (userId: string, data: CreateWorkspaceBody): Promise<any> => {
  const workspace = await workspaceRepo.createWorkspace({
    name: data.name,
    description: data.description || "",
    createdBy: userId,
  });
  return workspace.toObject();
};

export const getWorkspaces = async (userId: string): Promise<any[]> => {
  return workspaceRepo.findWorkspacesByUser(userId);
};

export const getWorkspaceById = async (workspaceId: string): Promise<any> => {
  const workspace = await workspaceRepo.findWorkspaceById(workspaceId);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");
  return workspace;
};

export const updateWorkspace = async (
  workspaceId: string,
  data: UpdateWorkspaceBody
): Promise<any> => {
  const workspace = await workspaceRepo.updateWorkspace(workspaceId, data);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");
  return workspace;
};

export const deleteWorkspace = async (workspaceId: string): Promise<void> => {
  const workspace = await workspaceRepo.deleteWorkspace(workspaceId);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");
};

export const addMember = async (
  workspaceId: string,
  userId: string,
  role: string
): Promise<any> => {
  const workspace = await workspaceRepo.addMember(workspaceId, userId, role);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");
  return workspace;
};

export const getMembers = async (workspaceId: string): Promise<any> => {
  const workspace = await workspaceRepo.findWorkspaceById(workspaceId);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");
  return workspace.members;
};

export const updateMember = async (
  workspaceId: string,
  memberId: string,
  role: string
): Promise<any> => {
  const workspace = await workspaceRepo.updateMember(workspaceId, memberId, role);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace or member not found");
  return workspace;
};

export const removeMember = async (
  workspaceId: string,
  memberId: string
): Promise<any> => {
  const workspace = await workspaceRepo.removeMember(workspaceId, memberId);
  if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace or member not found");
  return workspace;
};