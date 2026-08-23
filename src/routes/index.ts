import { Router, Router as ExpressRouter } from "express";
import authRoutes from "../modules/auth/auth.route";
import userRoutes from "../modules/users/user.route";
import formRoutes from "../modules/forms/form.route";
import pageRoutes from "../modules/pages/page.route";
import endPageRoutes from "../modules/end-pages/end-page.route";
import blockRoutes from "../modules/blocks/block.route";
import logicRoutes from "../modules/logic/logic.route";
import responseRoutes from "../modules/responses/response.route";
import publicFormRoutes from "../modules/public-form/public-form.route";
import analyticsRoutes from "../modules/analytics/analytics.route";
import dashboardRoutes from "../modules/dashboard/dashboard.route";
import settingsRoutes from "../modules/settings/settings.route";
import uploadRoutes from "../modules/uploads/upload.route";
import notificationRoutes from "../modules/notifications/notification.route";
import workspaceRoutes from "../modules/workspaces/workspace.route";

import { getPublicForm } from "../modules/public-form/public-form.controller";

const router: ExpressRouter = Router();

const apiPrefix = "/api/v1";

router.get("/f/:slug", getPublicForm);

router.use(`${apiPrefix}/auth`, authRoutes);
router.use(`${apiPrefix}/users`, userRoutes);
router.use(`${apiPrefix}/forms`, formRoutes);
router.use(`${apiPrefix}/forms`, pageRoutes);
router.use(`${apiPrefix}/forms`, endPageRoutes);
router.use(`${apiPrefix}/forms`, blockRoutes);
router.use(`${apiPrefix}/forms`, logicRoutes);
router.use(`${apiPrefix}/forms`, responseRoutes);
router.use(`${apiPrefix}/forms`, settingsRoutes);
router.use(`${apiPrefix}/public`, publicFormRoutes);
router.use(`${apiPrefix}/forms`, analyticsRoutes);
router.use(`${apiPrefix}/dashboard`, dashboardRoutes);
router.use(`${apiPrefix}/uploads`, uploadRoutes);
router.use(`${apiPrefix}/notifications`, notificationRoutes);
router.use(`${apiPrefix}/workspaces`, workspaceRoutes);

export default router;