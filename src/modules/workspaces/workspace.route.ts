import { Router, Router as ExpressRouter } from "express";
import * as workspaceController from "./workspace.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdParamSchema,
  addMemberSchema,
  memberIdParamSchema,
  updateMemberSchema,
} from "./workspace.validation";

const router: ExpressRouter = Router();

router.use(authenticate);

router.post("/", validate(createWorkspaceSchema), workspaceController.createWorkspace);
router.get("/", workspaceController.getWorkspaces);
router.get("/:workspaceId", validate(workspaceIdParamSchema), workspaceController.getWorkspaceById);
router.patch("/:workspaceId", validate(updateWorkspaceSchema), workspaceController.updateWorkspace);
router.delete("/:workspaceId", validate(workspaceIdParamSchema), workspaceController.deleteWorkspace);
router.post("/:workspaceId/members", validate(addMemberSchema), workspaceController.addMember);
router.get("/:workspaceId/members", validate(workspaceIdParamSchema), workspaceController.getMembers);
router.patch("/:workspaceId/members/:memberId", validate(updateMemberSchema), workspaceController.updateMember);
router.delete("/:workspaceId/members/:memberId", validate(memberIdParamSchema), workspaceController.removeMember);

export default router;