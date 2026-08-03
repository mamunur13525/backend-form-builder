import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { Form } from "../../models/Form";
import { FormResponse } from "../../models/FormResponse";
import { User } from "../../models/User";

export const getDashboardOverview: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const [totalForms, totalResponses, totalUsers, recentForms] = await Promise.all([
    Form.countDocuments(),
    FormResponse.countDocuments(),
    User.countDocuments(),
    Form.find().sort({ createdAt: -1 }).limit(5).select("title status createdAt").lean(),
  ]);

  sendSuccess(res, {
    totalForms,
    totalResponses,
    totalUsers,
    recentForms,
  });
});

export const getDashboardForms: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const forms = await Form.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("createdBy", "name email")
    .lean();

  sendSuccess(res, forms);
});

export const getDashboardResponses: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const [total, today, thisWeek, thisMonth] = await Promise.all([
    FormResponse.countDocuments(),
    FormResponse.countDocuments({
      submittedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
    FormResponse.countDocuments({
      submittedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
    FormResponse.countDocuments({
      submittedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  sendSuccess(res, { total, today, thisWeek, thisMonth });
});

export const getDashboardUsers: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const [total, active, admins] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ role: "admin" }),
  ]);

  sendSuccess(res, { total, active, admins, editors: 0, viewers: 0 });
});

export const getDashboardActivity: RequestHandler = asyncHandler(async (_req: Request, res: Response) => {
  const recentResponses = await FormResponse.find()
    .sort({ submittedAt: -1 })
    .limit(10)
    .populate("formId", "title")
    .lean();

  sendSuccess(res, recentResponses);
});