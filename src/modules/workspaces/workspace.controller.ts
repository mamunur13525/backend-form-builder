import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import * as workspaceService from "./workspace.service";

export const createWorkspace: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const workspace = await workspaceService.createWorkspace(req.user!.userId, req.body);
    sendSuccess(res, workspace, "Workspace created successfully", httpStatus.CREATED);
  }
);

export const getWorkspaces: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const workspaces = await workspaceService.getWorkspaces(req.user!.userId);
    sendSuccess(res, workspaces, "Workspaces retrieved successfully");
  }
);

export const getWorkspaceById: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const workspace = await workspaceService.getWorkspaceById(
      req.params.workspaceId as string,
      req.user?.userId
    );
    sendSuccess(res, workspace, "Workspace retrieved successfully");
  }
);

export const getWorkspaceBySlug: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const workspace = await workspaceService.getWorkspaceBySlug(
      req.params.slug as string,
      req.user?.userId
    );
    sendSuccess(res, workspace, "Workspace retrieved successfully");
  }
);

export const checkSlugAvailability: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const slug = (req.query.slug as string) || "";
    const result = await workspaceService.checkSlugAvailability(slug);
    sendSuccess(res, result, "Slug availability checked");
  }
);

export const updateWorkspace: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const workspace = await workspaceService.updateWorkspace(
      req.params.workspaceId as string,
      req.user!.userId,
      req.body
    );
    sendSuccess(res, workspace, "Workspace updated successfully");
  }
);

export const deleteWorkspace: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await workspaceService.deleteWorkspace(
      req.params.workspaceId as string,
      req.user!.userId
    );
    sendSuccess(res, result, "Workspace deleted successfully");
  }
);

export const getActiveWorkspace: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await workspaceService.getActiveWorkspace(req.user!.userId);
    sendSuccess(res, result, "Active workspace retrieved successfully");
  }
);

export const setActiveWorkspace: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await workspaceService.setActiveWorkspace(
      req.user!.userId,
      req.body.workspaceId
    );
    sendSuccess(res, result, "Active workspace updated successfully");
  }
);

/* -------------------------------------------------------------------------- */
/* Members                                                                    */
/* -------------------------------------------------------------------------- */

export const getMembers: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const members = await workspaceService.getMembers(
      req.params.workspaceId as string,
      req.user?.userId
    );
    sendSuccess(res, members, "Members retrieved successfully");
  }
);

export const addMember: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const role = req.body.role === "editor" ? "member" : req.body.role;
    const workspace = await workspaceService.updateMemberRole(
      req.params.workspaceId as string,
      req.body.userId,
      req.user!.userId,
      { role, canEditAllForms: req.body.canEditAllForms }
    );
    sendSuccess(res, workspace, "Member added successfully");
  }
);

export const updateMember: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const role = req.body.role === "editor" ? "member" : req.body.role;
    const members = await workspaceService.updateMemberRole(
      req.params.workspaceId as string,
      req.params.memberId as string,
      req.user!.userId,
      { role, canEditAllForms: req.body.canEditAllForms }
    );
    sendSuccess(res, members, "Member updated successfully");
  }
);

export const removeMember: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const members = await workspaceService.removeMember(
      req.params.workspaceId as string,
      req.params.memberId as string,
      req.user!.userId
    );
    sendSuccess(res, members, "Member removed successfully");
  }
);

/* -------------------------------------------------------------------------- */
/* Invitations                                                                */
/* -------------------------------------------------------------------------- */

export const inviteMember: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const role = req.body.role === "editor" ? "member" : req.body.role;
    const invitation = await workspaceService.inviteMember(
      req.params.workspaceId as string,
      req.user!.userId,
      {
        email: req.body.email,
        role,
        preAssignedFormIds: req.body.preAssignedFormIds,
        canEditAllForms: req.body.canEditAllForms,
      }
    );
    sendSuccess(res, invitation, "Invitation sent successfully", httpStatus.CREATED);
  }
);

export const getInvitations: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const invitations = await workspaceService.getInvitations(
      req.params.workspaceId as string,
      req.user!.userId
    );
    sendSuccess(res, invitations, "Invitations retrieved successfully");
  }
);

export const resendInvitation: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const invitation = await workspaceService.resendInvitation(
      req.params.workspaceId as string,
      req.params.invitationId as string,
      req.user!.userId
    );
    sendSuccess(res, invitation, "Invitation resent successfully");
  }
);

export const cancelInvitation: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await workspaceService.cancelInvitation(
      req.params.workspaceId as string,
      req.params.invitationId as string,
      req.user!.userId
    );
    sendSuccess(res, result, "Invitation cancelled successfully");
  }
);

export const getIncomingInvitations: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const invitations = await workspaceService.getIncomingInvitations(req.user!.email);
    sendSuccess(res, invitations, "Incoming invitations retrieved successfully");
  }
);

export const getInvitationByToken: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const invitation = await workspaceService.getInvitationByToken(req.params.token as string);
    sendSuccess(res, invitation, "Invitation preview retrieved successfully");
  }
);

export const acceptInvitation: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const token = (req.params.token || req.body?.token) as string;
    const workspace = await workspaceService.acceptInvitation(
      token,
      req.user!.userId,
      req.user!.email
    );
    sendSuccess(res, workspace, "Invitation accepted successfully");
  }
);

export const declineInvitation: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const token = (req.params.token || req.body?.token) as string;
    const result = await workspaceService.declineInvitation(
      token,
      req.user!.userId
    );
    sendSuccess(res, result, "Invitation declined successfully");
  }
);