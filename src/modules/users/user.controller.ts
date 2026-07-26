import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import { getPaginationParams } from "../../utils/pagination";
import * as userService from "./user.service";

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getMyProfile(req.user!.userId);
  sendSuccess(res, user, "Profile retrieved successfully");
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateMyProfile(req.user!.userId, req.body);
  sendSuccess(res, user, "Profile updated successfully");
});

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const { skip, limit, sort } = getPaginationParams(req.query as any);
  const result = await userService.getAllUsers(skip, limit, sort);
  sendSuccess(res, result.users, "Users retrieved successfully", httpStatus.OK);
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.id as string);
  sendSuccess(res, user, "User retrieved successfully");
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateUserById(req.params.id as string, req.body);
  sendSuccess(res, user, "User updated successfully");
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await userService.deleteUserById(req.params.id as string);
  sendSuccess(res, null, "User deleted successfully");
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateUserRole(req.params.id as string, req.body.role);
  sendSuccess(res, user, "User role updated successfully");
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateUserStatus(req.params.id as string, req.body.isActive);
  sendSuccess(res, user, "User status updated successfully");
});