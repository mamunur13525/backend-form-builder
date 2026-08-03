import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import * as workspaceService from "./workspace.service";

export const createWorkspace: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const workspace = await workspaceService.createWorkspace(req.user!.userId, req.body);
  sendSuccess(res, workspace, "Workspace created successfully", httpStatus.CREATED);
});

export const getWorkspaces: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const workspaces = await workspaceService.getWorkspaces(req.user!.userId);
  sendSuccess(res, workspaces, "Workspaces retrieved successfully");
});

export const getWorkspaceById: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const workspace = await workspaceService.getWorkspaceById(req.params.workspaceId as string);
  sendSuccess(res, workspace, "Workspace retrieved successfully");
});

export const updateWorkspace: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const workspace = await workspaceService.updateWorkspace(req.params.workspaceId as string, req.body);
  sendSuccess(res, workspace, "Workspace updated successfully");
});

export const deleteWorkspace: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await workspaceService.deleteWorkspace(req.params.workspaceId as string);
  sendSuccess(res, null, "Workspace deleted successfully");
});

export const addMember: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const workspace = await workspaceService.addMember(
    req.params.workspaceId as string,
    req.body.userId,
    req.body.role
  );
  sendSuccess(res, workspace, "Member added successfully");
});

export const getMembers: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const members = await workspaceService.getMembers(req.params.workspaceId as string);
  sendSuccess(res, members, "Members retrieved successfully");
});

export const updateMember: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const workspace = await workspaceService.updateMember(
    req.params.workspaceId as string,
    req.params.memberId as string,
    req.body.role
  );
  sendSuccess(res, workspace, "Member updated successfully");
});

export const removeMember: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const workspace = await workspaceService.removeMember(
    req.params.workspaceId as string,
    req.params.memberId as string
  );
  sendSuccess(res, workspace, "Member removed successfully");
});