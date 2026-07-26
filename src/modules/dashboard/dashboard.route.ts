import { Router, Router as ExpressRouter } from "express";
import * as dashboardController from "./dashboard.controller";
import { authenticate, authorize } from "../../middlewares/auth.middleware";

const router: ExpressRouter = Router();

router.use(authenticate);
router.use(authorize("admin"));

router.get("/overview", dashboardController.getDashboardOverview);
router.get("/forms", dashboardController.getDashboardForms);
router.get("/responses", dashboardController.getDashboardResponses);
router.get("/users", dashboardController.getDashboardUsers);
router.get("/activity", dashboardController.getDashboardActivity);

export default router;