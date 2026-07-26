import { Router, Router as ExpressRouter } from "express";
import * as userController from "./user.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate, authorize } from "../../middlewares/auth.middleware";
import {
  updateProfileSchema,
  updateUserSchema,
  updateRoleSchema,
  updateStatusSchema,
  userIdParamSchema,
} from "./user.validation";

const router: ExpressRouter = Router();

router.use(authenticate);

router.get("/me", userController.getMe);
router.patch("/me", validate(updateProfileSchema), userController.updateMe);

// Admin only routes
router.get("/", authorize("admin"), userController.getAllUsers);
router.get("/:id", authorize("admin"), validate(userIdParamSchema), userController.getUserById);
router.patch("/:id", authorize("admin"), validate(userIdParamSchema), validate(updateUserSchema), userController.updateUser);
router.delete("/:id", authorize("admin"), validate(userIdParamSchema), userController.deleteUser);
router.patch("/:id/role", authorize("admin"), validate(userIdParamSchema), validate(updateRoleSchema), userController.updateUserRole);
router.patch("/:id/status", authorize("admin"), validate(userIdParamSchema), validate(updateStatusSchema), userController.updateUserStatus);

export default router;