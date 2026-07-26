import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { Form } from "../../models/Form";
import { FormResponse } from "../../models/FormResponse";
import { FormField } from "../../models/FormField";

export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const formId = req.params.formId as string;

  const [totalViews, totalSubmissions, form] = await Promise.all([
    FormResponse.countDocuments({ formId }),
    FormResponse.countDocuments({ formId }),
    Form.findById(formId).select("title createdAt").lean(),
  ]);

  sendSuccess(res, {
    formId,
    formTitle: form?.title,
    totalViews,
    totalSubmissions,
    conversionRate: totalViews > 0 ? ((totalSubmissions / totalViews) * 100).toFixed(2) : "0",
  });
});

export const getAnalyticsOverview = asyncHandler(async (req: Request, res: Response) => {
  const formId = req.params.formId as string;

  const [totalResponses, todayResponses, fields] = await Promise.all([
    FormResponse.countDocuments({ formId }),
    FormResponse.countDocuments({
      formId,
      submittedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
    FormField.find({ formId }).countDocuments(),
  ]);

  sendSuccess(res, {
    totalResponses,
    todayResponses,
    totalFields: fields,
    averageResponsesPerDay: totalResponses > 0 ? (totalResponses / 30).toFixed(1) : "0",
  });
});

export const getAnalyticsViews = asyncHandler(async (req: Request, res: Response) => {
  // Placeholder - implement with actual view tracking
  sendSuccess(res, { formId: req.params.formId as string, views: 0, uniqueVisitors: 0 });
});

export const getAnalyticsSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const formId = req.params.formId as string;
  const submissions = await FormResponse.find({ formId })
    .sort({ submittedAt: -1 })
    .limit(100)
    .select("submittedAt")
    .lean();

  sendSuccess(res, { total: submissions.length, submissions });
});

export const getAnalyticsConversion = asyncHandler(async (req: Request, res: Response) => {
  const formId = req.params.formId as string;
  const total = await FormResponse.countDocuments({ formId });

  sendSuccess(res, {
    formId,
    views: total,
    submissions: total,
    conversionRate: "0",
    dropOffRate: "0",
  });
});

export const getAnalyticsDropoff = asyncHandler(async (req: Request, res: Response) => {
  const formId = req.params.formId as string;
  const fields = await FormField.find({ formId }).sort({ order: 1 }).lean();
  const responses = await FormResponse.find({ formId }).lean();

  // Calculate dropoff per field
  const dropoffData = fields.map((field, index) => {
    const responsesWithField = responses.filter((r) =>
      r.answers.some((a) => a.fieldKey === field.fieldKey)
    );
    return {
      fieldId: field._id,
      fieldKey: field.fieldKey,
      label: field.label,
      reached: responses.length,
      answered: responsesWithField.length,
      dropoff: responses.length > 0
        ? ((responses.length - responsesWithField.length) / responses.length) * 100
        : 0,
    };
  });

  sendSuccess(res, { formId, dropoffData });
});

export const getAnalyticsField = asyncHandler(async (req: Request, res: Response) => {
  const { formId, fieldId } = req.params;
  const field = await FormField.findById(fieldId).lean();
  if (!field) {
    return sendSuccess(res, null, "Field not found");
  }

  const responses = await FormResponse.find({ formId }).lean();
  const fieldAnswers = responses
    .filter((r) => r.answers.some((a) => a.fieldKey === field.fieldKey))
    .map((r) => r.answers.find((a) => a.fieldKey === field.fieldKey));

  sendSuccess(res, {
    field,
    totalResponses: fieldAnswers.length,
    answers: fieldAnswers,
  });
});