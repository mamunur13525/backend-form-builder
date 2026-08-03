import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { Form } from "../../models/Form";
import { FormResponse } from "../../models/FormResponse";

export const getAnalytics: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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

export const getAnalyticsOverview: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const formId = req.params.formId as string;

  const [totalResponses, todayResponses, form] = await Promise.all([
    FormResponse.countDocuments({ formId }),
    FormResponse.countDocuments({
      formId,
      submittedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
    Form.findById(formId).select("fields").lean(),
  ]);

  const totalFields = form?.fields?.length || 0;

  sendSuccess(res, {
    totalResponses,
    todayResponses,
    totalFields,
    averageResponsesPerDay: totalResponses > 0 ? (totalResponses / 30).toFixed(1) : "0",
  });
});

export const getAnalyticsViews: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Placeholder - implement with actual view tracking
  sendSuccess(res, { formId: req.params.formId as string, views: 0, uniqueVisitors: 0 });
});

export const getAnalyticsSubmissions: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const formId = req.params.formId as string;
  const submissions = await FormResponse.find({ formId })
    .sort({ submittedAt: -1 })
    .limit(100)
    .select("submittedAt")
    .lean();

  sendSuccess(res, { total: submissions.length, submissions });
});

export const getAnalyticsConversion: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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

export const getAnalyticsDropoff: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const formId = req.params.formId as string;
  const form = await Form.findById(formId).select("fields").lean();
  const responses = await FormResponse.find({ formId }).lean();

  const fields = (form?.fields || []).sort((a: any, b: any) => a.order - b.order);

  // Calculate dropoff per field
  const dropoffData = fields.map((field: any) => {
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

export const getAnalyticsField: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { formId, fieldId } = req.params;
  const form = await Form.findOne(
    { _id: formId, "fields._id": fieldId },
    { "fields.$": 1 }
  ).lean();

  if (!form || !form.fields || form.fields.length === 0) {
    sendSuccess(res, null, "Field not found");
    return;
  }

  const field = form.fields[0];
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
