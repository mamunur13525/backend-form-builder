import { Router, Router as ExpressRouter } from "express";
import * as analyticsController from "./analytics.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router: ExpressRouter = Router();

router.use(authenticate);

router.get("/:formId/analytics", analyticsController.getAnalytics);
router.get("/:formId/analytics/overview", analyticsController.getAnalyticsOverview);
router.get("/:formId/analytics/views", analyticsController.getAnalyticsViews);
router.get("/:formId/analytics/submissions", analyticsController.getAnalyticsSubmissions);
router.get("/:formId/analytics/conversion", analyticsController.getAnalyticsConversion);
router.get("/:formId/analytics/dropoff", analyticsController.getAnalyticsDropoff);
router.get("/:formId/analytics/page/:pageId", analyticsController.getAnalyticsPage);

export default router;