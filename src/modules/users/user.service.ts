import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { getPaginationMeta } from "../../utils/pagination";
import * as userRepo from "./user.repository";
import { UpdateProfileBody, UpdateUserBody, UserResponse } from "./user.types";

const toUserResponse = (user: any): UserResponse => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  avatarUrl: user.avatarUrl,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const getMyProfile = async (userId: string): Promise<UserResponse> => {
  const user = await userRepo.findUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  return toUserResponse(user);
};

export const updateMyProfile = async (
  userId: string,
  data: UpdateProfileBody
): Promise<UserResponse> => {
  const user = await userRepo.updateUser(userId, data);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  return toUserResponse(user);
};

export const getAllUsers = async (
  skip: number,
  limit: number,
  sort: Record<string, 1 | -1>,
  filter: Record<string, any> = {}
) => {
  const [users, total] = await Promise.all([
    userRepo.findAllUsers(skip, limit, sort, filter),
    userRepo.countUsers(filter),
  ]);

  return {
    users: users.map(toUserResponse),
    meta: getPaginationMeta(total, Math.floor(skip / limit) + 1, limit),
  };
};

export const getUserById = async (id: string): Promise<UserResponse> => {
  const user = await userRepo.findUserById(id);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  return toUserResponse(user);
};

export const updateUserById = async (
  id: string,
  data: UpdateUserBody
): Promise<UserResponse> => {
  const user = await userRepo.updateUser(id, data);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  return toUserResponse(user);
};

export const deleteUserById = async (id: string): Promise<void> => {
  const user = await userRepo.deleteUser(id);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
};

export const updateUserRole = async (
  id: string,
  role: string
): Promise<UserResponse> => {
  const user = await userRepo.updateUser(id, { role });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  return toUserResponse(user);
};

export const updateUserStatus = async (
  id: string,
  isActive: boolean
): Promise<UserResponse> => {
  const user = await userRepo.updateUser(id, { isActive });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  return toUserResponse(user);
};