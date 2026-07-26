import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import * as authService from "./auth.service";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  sendSuccess(res, result, "Registration successful", httpStatus.CREATED);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  sendSuccess(res, result, "Login successful");
});

export const googleSignup = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.googleSignup(req.body);
  sendSuccess(res, result, "Google signup successful", httpStatus.CREATED);
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  // With JWT, logout is handled client-side by removing the token
  // For blacklist approach, implement token blacklist in DB
  sendSuccess(res, null, "Logout successful");
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body;
  const result = await authService.refreshToken(token);
  sendSuccess(res, result, "Token refreshed successfully");
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email);
  sendSuccess(res, null, "If the email exists, a reset link has been sent");
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.password);
  sendSuccess(res, null, "Password reset successful");
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  await authService.verifyEmail(req.query.token as string);
  sendSuccess(res, null, "Email verified successfully");
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getProfile(req.user!.userId);
  sendSuccess(res, user, "Profile retrieved successfully");
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.changePassword(
    req.user!.userId,
    req.body.currentPassword,
    req.body.newPassword
  );
  sendSuccess(res, null, "Password changed successfully");
});
