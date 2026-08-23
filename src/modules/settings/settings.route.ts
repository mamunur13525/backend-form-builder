import { Router, Router as ExpressRouter } from "express";
import * as settingsController from "./settings.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  getSettingsSchema,
  updateAccessSettingsSchema,
  updateEmailSettingsSchema,
  updateGeneralSettingsSchema,
  updateHiddenFieldsSchema,
  updateVariablesSchema,
} from "./settings.validation";

const router: ExpressRouter = Router();

// Settings are form-level configuration, so only authenticated admins can read
// or edit them. Public form data is served separately.
router.use(authenticate);

router.get("/:formId/settings", validate(getSettingsSchema), settingsController.getSettings);
router.patch("/:formId/settings/general", validate(updateGeneralSettingsSchema), settingsController.updateGeneralSettings);
router.patch("/:formId/settings/email", validate(updateEmailSettingsSchema), settingsController.updateEmailSettings);
router.patch("/:formId/settings/access", validate(updateAccessSettingsSchema), settingsController.updateAccessSettings);
router.patch("/:formId/settings/hidden-fields", validate(updateHiddenFieldsSchema), settingsController.updateHiddenFields);
router.patch("/:formId/settings/variables", validate(updateVariablesSchema), settingsController.updateVariables);

export default router;