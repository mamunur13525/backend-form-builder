import { Router, Router as ExpressRouter } from "express";
import * as authController from "./auth.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { authRateLimiter } from "../../middlewares/rate-limit.middleware";
import {
  registerSchema,
  loginSchema,
  googleSignupSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
} from "./auth.validation";

const router: ExpressRouter = Router();

router.post("/register", authRateLimiter, validate(registerSchema), authController.register);
router.post("/login", authRateLimiter, validate(loginSchema), authController.login);
router.post("/google", authRateLimiter, validate(googleSignupSchema), authController.googleSignup);
router.post("/logout", authenticate, authController.logout);
router.post("/refresh-token", validate(refreshTokenSchema), authController.refreshToken);
router.post("/forgot-password", authRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", authRateLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post("/verify-email", validate(verifyEmailSchema), authController.verifyEmail);
router.get("/me", authenticate, authController.getMe);
router.patch("/change-password", authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;
