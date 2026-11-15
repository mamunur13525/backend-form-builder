import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { Form } from "../../models/Form";
import { FormResponse } from "../../models/FormResponse";
import { FormView } from "../../models/FormView";
import { FormVersion } from "../../models/FormVersion";

export const getAnalytics: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const formId = req.params.formId as string;
  const timeRange = (req.query.timeRange as string) || "all";
  const device = (req.query.device as string) || "all";

  const form = await Form.findById(formId).lean();
  if (!form) {
    sendSuccess(res, { formId, views: 0, starts: 0, submissions: 0, completionRate: 0, completionTime: 0, trends: [], dropoff: [] });
    return;
  }

  // Determine date boundary
  let startDate: Date | null = null;
  const now = new Date();
  if (timeRange === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  } else if (timeRange === "7d") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeRange === "30d") {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (timeRange === "90d") {
    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }

  // Build filter for FormView
  const viewFilter: Record<string, any> = { formId: form._id };
  if (startDate) viewFilter.createdAt = { $gte: startDate };
  if (device !== "all") viewFilter.device = device;

  // Build filter for FormResponse
  const responseFilter: Record<string, any> = { formId: form._id };
  if (startDate) responseFilter.submittedAt = { $gte: startDate };
  if (device === "mobile") {
    responseFilter["metadata.userAgent"] = { $regex: /mobile|android|iphone/i };
  } else if (device === "tablet") {
    responseFilter["metadata.userAgent"] = { $regex: /tablet|ipad/i };
  } else if (device === "desktop") {
    responseFilter["metadata.userAgent"] = { $not: { $regex: /mobile|android|iphone|tablet|ipad/i } };
  }

  const [formViews, formResponses] = await Promise.all([
    FormView.find(viewFilter).lean(),
    FormResponse.find(responseFilter).lean(),
  ]);

  const completedResponses = formResponses.filter((r) => r.status !== "partial");
  const partialResponses = formResponses.filter((r) => r.status === "partial");

  // Calculate starts and views
  const viewSessions = new Set(formViews.map((v) => v.sessionId));
  const responseSessions = new Set(formResponses.map((r) => r.sessionId).filter(Boolean));
  const startedViewSessions = new Set(formViews.filter((v) => v.started || v.completed).map((v) => v.sessionId));

  const allStartsSessions = new Set([...startedViewSessions, ...responseSessions]);
  const starts = allStartsSessions.size > 0 ? allStartsSessions.size : formResponses.length;
  const views = Math.max(formViews.length, starts, formResponses.length);
  const submissions = completedResponses.length;

  // Completion rate: (Submissions / Starts) * 100
  const completionRate = starts > 0 ? Math.round((submissions / starts) * 100) : (views > 0 ? Math.round((submissions / views) * 100) : 0);

  // Average completion time in seconds
  let totalTime = 0;
  let timedCount = 0;
  for (const resp of completedResponses) {
    if (resp.createdAt && resp.submittedAt) {
      const diff = Math.round((new Date(resp.submittedAt).getTime() - new Date(resp.createdAt).getTime()) / 1000);
      if (diff > 0 && diff < 86400) {
        totalTime += diff;
        timedCount++;
      }
    }
  }
  const completionTime = timedCount > 0 ? Math.round(totalTime / timedCount) : 0;

  // Trends calculation: generate daily buckets
  const daysCount = timeRange === "7d" ? 7 : timeRange === "today" ? 1 : timeRange === "90d" ? 30 : 14;
  const trends: Array<{ date: string; views: number; starts: number; submissions: number }> = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const nextD = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
    const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const dayViews = formViews.filter((v) => {
      const t = new Date(v.createdAt).getTime();
      return t >= d.getTime() && t < nextD.getTime();
    }).length;

    const dayResponses = formResponses.filter((r) => {
      const t = new Date(r.submittedAt).getTime();
      return t >= d.getTime() && t < nextD.getTime();
    });

    const daySubmissions = dayResponses.filter((r) => r.status !== "partial").length;
    const dayStarts = Math.max(dayResponses.length, dayViews > 0 && daySubmissions > 0 ? daySubmissions : 0);

    trends.push({
      date: dateLabel,
      views: Math.max(dayViews, dayStarts, daySubmissions),
      starts: dayStarts,
      submissions: daySubmissions,
    });
  }

  // Drop-off rate question by question
  let version = null;
  const versionId = form.publishedVersionId || form.draftVersionId;
  if (versionId) {
    version = await FormVersion.findById(versionId).lean();
  }

  const rawPages = (version?.formSchema?.pages || form.pages || []).filter((p: any) => p.isActive !== false);
  const sortedPages = [...rawPages].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

  interface QuestionMeta {
    id: string;
    key: string;
    pageKey: string;
    title: string;
    type: string;
  }

  const questions: QuestionMeta[] = [];
  for (const page of sortedPages) {
    const blocks = (page.questions && page.questions.length > 0)
      ? page.questions
      : (page.blocks && page.blocks.length > 0)
        ? page.blocks
        : [
            {
              blockKey: page.pageKey,
              questionKey: page.pageKey,
              title: page.title || page.label || "Untitled",
              type: page.type || "shortText",
            },
          ];

    const sortedBlocks = [...blocks].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    sortedBlocks.forEach((b: any, idx: number) => {
      const key = b.questionKey || b.blockKey || (sortedBlocks.length === 1 ? page.pageKey : `${page.pageKey}_q${idx + 1}`);
      const title = b.title || b.label || (sortedBlocks.length === 1 ? (page.title || page.label) : `Question ${idx + 1}`);
      questions.push({
        id: b._id?.toString() || key,
        key,
        pageKey: page.pageKey,
        title: title || "Question",
        type: b.type || page.type || "shortText",
      });
    });
  }

  // Calculate views and drop-off per question
  let currentAudience = starts;
  const dropoff = questions.map((q, idx) => {
    const qViews = currentAudience;
    // Count respondents who answered this question
    const answeredCount = formResponses.filter((r) =>
      r.answers?.some(
        (a: any) =>
          a.questionKey === q.key ||
          a.blockKey === q.key ||
          a.pageKey === q.key ||
          a.pageKey === q.pageKey
      )
    ).length;

    // Next audience is respondents who answered this question or subsequent ones
    const isLast = idx === questions.length - 1;
    const nextAudience = isLast ? submissions : Math.min(qViews, answeredCount);
    const dropoffCount = Math.max(0, qViews - nextAudience);
    const dropoffRate = qViews > 0 ? Math.round((dropoffCount / qViews) * 100) : 0;

    currentAudience = nextAudience;

    return {
      id: q.id,
      key: q.key,
      title: q.title,
      type: q.type,
      views: qViews,
      dropoffRate,
    };
  });

  sendSuccess(res, {
    formId,
    formTitle: form.title,
    views,
    starts,
    submissions,
    completionRate,
    completionTime,
    // Keep backwards compatibility fields:
    totalViews: views,
    totalSubmissions: submissions,
    conversionRate: completionRate.toString(),
    trends,
    dropoff,
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
    Form.findById(formId).select("pages").lean(),
  ]);

  const totalPages = form?.pages?.length || 0;

  sendSuccess(res, {
    totalResponses,
    todayResponses,
    totalPages,
    averageResponsesPerDay: totalResponses > 0 ? (totalResponses / 30).toFixed(1) : "0",
  });
});

export const getAnalyticsViews: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const formId = req.params.formId as string;
  const views = await FormView.countDocuments({ formId });
  const uniqueVisitors = (await FormView.distinct("sessionId", { formId })).length;
  sendSuccess(res, { formId, views, uniqueVisitors });
});

export const getAnalyticsSubmissions: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const formId = req.params.formId as string;
  const submissions = await FormResponse.find({ formId })
    .sort({ submittedAt: -1 })
    .limit(100)
    .select("submittedAt status")
    .lean();

  sendSuccess(res, { total: submissions.length, submissions });
});

export const getAnalyticsConversion: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const formId = req.params.formId as string;
  const [views, completed, partial] = await Promise.all([
    FormView.countDocuments({ formId }),
    FormResponse.countDocuments({ formId, $or: [{ status: "completed" }, { status: { $exists: false } }, { status: null }] }),
    FormResponse.countDocuments({ formId, status: "partial" }),
  ]);

  const starts = completed + partial;
  const totalViews = Math.max(views, starts);
  const conversionRate = starts > 0 ? ((completed / starts) * 100).toFixed(2) : "0";

  sendSuccess(res, {
    formId,
    views: totalViews,
    starts,
    submissions: completed,
    conversionRate,
    dropOffRate: starts > 0 ? (((starts - completed) / starts) * 100).toFixed(2) : "0",
  });
});

export const getAnalyticsDropoff: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const formId = req.params.formId as string;
  const form = await Form.findById(formId).select("pages publishedVersionId draftVersionId").lean();
  if (!form) {
    sendSuccess(res, { formId, dropoffData: [] });
    return;
  }

  const responses = await FormResponse.find({ formId }).lean();
  const pages = (form.pages || []).sort((a: any, b: any) => a.order - b.order);

  const dropoffData = pages.map((page: any) => {
    const responsesWithPage = responses.filter((r) =>
      r.answers?.some((a: any) => a.pageKey === page.pageKey)
    );
    return {
      pageId: page._id,
      pageKey: page.pageKey,
      label: page.label || page.title,
      reached: responses.length,
      answered: responsesWithPage.length,
      dropoff: responses.length > 0
        ? Math.round(((responses.length - responsesWithPage.length) / responses.length) * 100)
        : 0,
    };
  });

  sendSuccess(res, { formId, dropoffData });
});

export const getAnalyticsPage: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { formId, pageId } = req.params;
  const form = await Form.findOne(
    { _id: formId, "pages._id": pageId },
    { "pages.$": 1 }
  ).lean();

  if (!form || !form.pages || form.pages.length === 0) {
    sendSuccess(res, null, "Page not found");
    return;
  }

  const page = form.pages[0];
  const responses = await FormResponse.find({ formId }).lean();
  const pageAnswers = responses
    .filter((r) => r.answers?.some((a: any) => a.pageKey === page.pageKey))
    .map((r) => r.answers?.find((a: any) => a.pageKey === page.pageKey));

  sendSuccess(res, {
    page,
    totalResponses: pageAnswers.length,
    answers: pageAnswers,
  });
});
