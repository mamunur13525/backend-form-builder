import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import { ApiError } from "../../utils/ApiError";
import { nanoid } from "nanoid";

// In-memory store for notifications (replace with DB model in production)
let notifications: any[] = [];

export const getNotifications: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userNotifications = notifications.filter(
    (n) => n.userId === req.user!.userId
  );
  sendSuccess(res, userNotifications, "Notifications retrieved successfully");
});

export const markAsRead: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const notification = notifications.find(
    (n) => n.id === req.params.id && n.userId === req.user!.userId
  );
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, "Notification not found");
  }
  notification.read = true;
  sendSuccess(res, notification, "Notification marked as read");
});

export const markAllAsRead: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  notifications
    .filter((n) => n.userId === req.user!.userId)
    .forEach((n) => { n.read = true; });
  sendSuccess(res, null, "All notifications marked as read");
});

export const deleteNotification: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const index = notifications.findIndex(
    (n) => n.id === req.params.id && n.userId === req.user!.userId
  );
  if (index === -1) {
    throw new ApiError(httpStatus.NOT_FOUND, "Notification not found");
  }
  notifications.splice(index, 1);
  sendSuccess(res, null, "Notification deleted successfully");
});
