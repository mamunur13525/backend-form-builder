import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import { ApiError } from "../../utils/ApiError";

// In-memory store for notifications (replace with DB model in production)
let notifications: any[] = [];
let nextId = 1;

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userNotifications = notifications.filter(
    (n) => n.userId === req.user!.userId
  );
  sendSuccess(res, userNotifications, "Notifications retrieved successfully");
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = notifications.find(
    (n) => n.id === parseInt(req.params.id as string) && n.userId === req.user!.userId
  );
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, "Notification not found");
  }
  notification.read = true;
  sendSuccess(res, notification, "Notification marked as read");
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  notifications
    .filter((n) => n.userId === req.user!.userId)
    .forEach((n) => { n.read = true; });
  sendSuccess(res, null, "All notifications marked as read");
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const index = notifications.findIndex(
    (n) => n.id === parseInt(req.params.id as string) && n.userId === req.user!.userId
  );
  if (index === -1) {
    throw new ApiError(httpStatus.NOT_FOUND, "Notification not found");
  }
  notifications.splice(index, 1);
  sendSuccess(res, null, "Notification deleted successfully");
});