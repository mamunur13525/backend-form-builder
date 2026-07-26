import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import * as workspaceService from "./workspace.service";

export const createWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const workspace = await workspaceService.createWorkspace(req.user!.userId, req.body);
  sendSuccess(res, workspace, "Workspace created successfully", httpStatus.CREATED);
});

export const getWorkspaces = asyncHandler(async (req: Request, res: Response) => {
  const workspaces = await workspaceService.getWorkspaces(req.user!.userId);
  sendSuccess(res, workspaces, "Workspaces retrieved successfully");
});

export const getWorkspaceById = asyncHandler(async (req: Request, res: Response) => {
  const workspace = await workspaceService.getWorkspaceById(req.params.workspaceId as string);
  sendSuccess(res, workspace, "Workspace retrieved successfully");
});

export const updateWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const workspace = await workspaceService.updateWorkspace(req.params.workspaceId as string, req.body);
  sendSuccess(res, workspace, "Workspace updated successfully");
});

export const deleteWorkspace = asyncHandler(async (req: Request, res: Response) => {
  await workspaceService.deleteWorkspace(req.params.workspaceId as string);
  sendSuccess(res, null, "Workspace deleted successfully");
});

export const addMember = asyncHandler(async (req: Request, res: Response) => {
  const workspace = await workspaceService.addMember(
    req.params.workspaceId as string,
    req.body.userId,
    req.body.role
  );
  sendSuccess(res, workspace, "Member added successfully");
});

export const getMembers = asyncHandler(async (req: Request, res: Response) => {
  const members = await workspaceService.getMembers(req.params.workspaceId as string);
  sendSuccess(res, members, "Members retrieved successfully");
});

export const updateMember = asyncHandler(async (req: Request, res: Response) => {
  const workspace = await workspaceService.updateMember(
    req.params.workspaceId as string,
    req.params.memberId as string,
    req.body.role
  );
  sendSuccess(res, workspace, "Member updated successfully");
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const workspace = await workspaceService.removeMember(
    req.params.workspaceId as string,
    req.params.memberId as string
  );
  sendSuccess(res, workspace, "Member removed successfully");
});