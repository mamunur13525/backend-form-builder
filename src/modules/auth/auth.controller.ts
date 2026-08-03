import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import * as authService from "./auth.service";

export const register: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await authService.register(req.body);
  sendSuccess(res, result, "Registration successful", httpStatus.CREATED);
});

export const login: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await authService.login(req.body);
  sendSuccess(res, result, "Login successful");
});

export const googleSignup: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await authService.googleSignup(req.body);
  sendSuccess(res, result, "Google signup successful", httpStatus.CREATED);
});

export const logout: RequestHandler = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  // With JWT, logout is handled client-side by removing the token
  // For blacklist approach, implement token blacklist in DB
  sendSuccess(res, null, "Logout successful");
});

export const refreshToken: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;
  const result = await authService.refreshToken(token);
  sendSuccess(res, result, "Token refreshed successfully");
});

export const forgotPassword: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await authService.forgotPassword(req.body.email);
  sendSuccess(res, null, "If the email exists, a reset link has been sent");
});

export const resetPassword: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await authService.resetPassword(req.body.token, req.body.password);
  sendSuccess(res, null, "Password reset successful");
});

export const verifyEmail: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await authService.verifyEmail(req.query.token as string);
  sendSuccess(res, null, "Email verified successfully");
});

export const getMe: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await authService.getProfile(req.user!.userId);
  sendSuccess(res, user, "Profile retrieved successfully");
});

export const changePassword: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await authService.changePassword(
    req.user!.userId,
    req.body.currentPassword,
    req.body.newPassword
  );
  sendSuccess(res, null, "Password changed successfully");
});
