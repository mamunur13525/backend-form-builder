import { Router, Router as ExpressRouter } from "express";
import * as workspaceController from "./workspace.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdParamSchema,
  setActiveWorkspaceSchema,
  addMemberSchema,
  memberIdParamSchema,
  updateMemberSchema,
  inviteMemberSchema,
  invitationIdParamSchema,
  tokenParamSchema,
} from "./workspace.validation";

const router: ExpressRouter = Router();

/* -------------------------------------------------------------------------- */
/* Public Routes (no authentication required)                                 */
/* -------------------------------------------------------------------------- */

// Preview invitation before login
router.get("/invitations/:token", validate(tokenParamSchema), workspaceController.getInvitationByToken);
router.get("/slug-available", workspaceController.checkSlugAvailability);

/* -------------------------------------------------------------------------- */
/* Authenticated Routes                                                       */
/* -------------------------------------------------------------------------- */

router.use(authenticate);

// Workspaces list and creation
router.post("/", validate(createWorkspaceSchema), workspaceController.createWorkspace);
router.get("/", workspaceController.getWorkspaces);

// Active workspace switching
router.get("/active", workspaceController.getActiveWorkspace);
router.put("/active", validate(setActiveWorkspaceSchema), workspaceController.setActiveWorkspace);

// Incoming invitations for the signed-in user
router.get("/invitations", workspaceController.getIncomingInvitations);
router.post("/invitations/accept", workspaceController.acceptInvitation);
router.post("/invitations/decline", workspaceController.declineInvitation);
router.post("/invitations/:token/accept", validate(tokenParamSchema), workspaceController.acceptInvitation);
router.post("/invitations/:token/reject", validate(tokenParamSchema), workspaceController.declineInvitation);
router.post("/invitations/:token/decline", validate(tokenParamSchema), workspaceController.declineInvitation);

// Workspace by slug
router.get("/slug/:slug", workspaceController.getWorkspaceBySlug);

// Specific workspace actions
router.get("/:workspaceId", validate(workspaceIdParamSchema), workspaceController.getWorkspaceById);
router.patch("/:workspaceId", validate(updateWorkspaceSchema), workspaceController.updateWorkspace);
router.delete("/:workspaceId", validate(workspaceIdParamSchema), workspaceController.deleteWorkspace);

// Workspace members
router.get("/:workspaceId/members", validate(workspaceIdParamSchema), workspaceController.getMembers);
router.post("/:workspaceId/members", validate(addMemberSchema), workspaceController.addMember);
router.patch("/:workspaceId/members/:memberId/role", validate(updateMemberSchema), workspaceController.updateMember);
router.patch("/:workspaceId/members/:memberId", validate(updateMemberSchema), workspaceController.updateMember);
router.delete("/:workspaceId/members/:memberId", validate(memberIdParamSchema), workspaceController.removeMember);

// Workspace invitations (inviter / admin side)
router.get("/:workspaceId/invitations", validate(workspaceIdParamSchema), workspaceController.getInvitations);
router.post("/:workspaceId/invitations", validate(inviteMemberSchema), workspaceController.inviteMember);
router.post(
  "/:workspaceId/invitations/:invitationId/resend",
  validate(invitationIdParamSchema),
  workspaceController.resendInvitation
);
router.delete(
  "/:workspaceId/invitations/:invitationId",
  validate(invitationIdParamSchema),
  workspaceController.cancelInvitation
);

export default router;