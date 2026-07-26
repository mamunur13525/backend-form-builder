import { Router, Router as ExpressRouter } from "express";
import * as notificationController from "./notification.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router: ExpressRouter = Router();

router.use(authenticate);

router.get("/", notificationController.getNotifications);
router.patch("/:id/read", notificationController.markAsRead);
router.patch("/read-all", notificationController.markAllAsRead);
router.delete("/:id", notificationController.deleteNotification);

export default router;