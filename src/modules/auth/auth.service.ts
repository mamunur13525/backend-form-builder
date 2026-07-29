import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import * as authRepo from "./auth.repository";
import * as authUtils from "./auth.utils";
import {
  RegisterBody,
  LoginBody,
  GoogleSignupBody,
  AuthResponse,
  AuthTokens,
} from "./auth.types";

export const register = async (data: RegisterBody): Promise<AuthResponse> => {
  const existingUser = await authRepo.findUserByEmail(data.email);
  if (existingUser) {
    throw new ApiError(httpStatus.CONFLICT, "Email already registered");
  }

  const passwordHash = await authUtils.hashPassword(data.password);
  const user = await authRepo.createUser({
    name: data.name,
    email: data.email.toLowerCase(),
    passwordHash,
    provider: "email",
  });

  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const accessToken = authUtils.generateAccessToken(payload);
  const refreshToken = authUtils.generateRefreshToken(payload);

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
    tokens: { accessToken, refreshToken },
  };
};

export const login = async (data: LoginBody): Promise<AuthResponse> => {
  console.log({ data });
  const user = await authRepo.findUserByEmail(data.email);
  console.log({ user });
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new ApiError(httpStatus.FORBIDDEN, "Account is deactivated");
  }

  if (!user.passwordHash) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "This account uses Google sign-in. Please sign in with Google.",
    );
  }

  const isPasswordValid = await authUtils.comparePassword(
    data.password,
    user.passwordHash,
  );
  if (!isPasswordValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  await authRepo.updateLastLogin(user._id.toString());

  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const accessToken = authUtils.generateAccessToken(payload);
  const refreshToken = authUtils.generateRefreshToken(payload);

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
    tokens: { accessToken, refreshToken },
  };
};

export const googleSignup = async (
  data: GoogleSignupBody,
): Promise<AuthResponse> => {
  const googleUser = await authUtils.verifyGoogleToken(data.idToken);

  if (!googleUser.email_verified) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Google email is not verified");
  }

  // Check if a user with this Google ID already exists
  let user = await authRepo.findUserByGoogleId(googleUser.sub);

  if (user) {
    // Existing Google user - just update last login and return tokens
    await authRepo.updateLastLogin(user._id.toString());
  } else {
    // Check if a user with this email already exists (email/password user)
    const existingUser = await authRepo.findUserByEmail(googleUser.email);

    if (existingUser) {
      // Link Google account to existing email/password user
      user = await authRepo.updateGoogleId(
        existingUser._id.toString(),
        googleUser.sub,
        googleUser.picture || existingUser.avatarUrl,
      );
      if (!user) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          "Failed to link Google account",
        );
      }
      await authRepo.updateLastLogin(user._id.toString());
    } else {
      // Create a new user with Google provider
      user = await authRepo.createUser({
        name: googleUser.name,
        email: googleUser.email.toLowerCase(),
        googleId: googleUser.sub,
        provider: "google",
        avatarUrl: googleUser.picture || "",
      });
      await authRepo.updateLastLogin(user._id.toString());
    }
  }

  if (!user) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create or retrieve user",
    );
  }

  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const accessToken = authUtils.generateAccessToken(payload);
  const refreshToken = authUtils.generateRefreshToken(payload);

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
    tokens: { accessToken, refreshToken },
  };
};

export const refreshToken = async (token: string): Promise<AuthTokens> => {
  try {
    const decoded = authUtils.verifyRefreshToken(token);
    const user = await authRepo.findUserById(decoded.userId);
    if (!user || !user.isActive) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
    }

    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    return {
      accessToken: authUtils.generateAccessToken(payload),
      refreshToken: authUtils.generateRefreshToken(payload),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Invalid or expired refresh token",
    );
  }
};

export const getProfile = async (userId: string) => {
  const user = await authRepo.findUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  const user = await authRepo.findUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!user.passwordHash) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Cannot change password. This account uses Google sign-in.",
    );
  }

  const isPasswordValid = await authUtils.comparePassword(
    currentPassword,
    user.passwordHash,
  );
  if (!isPasswordValid) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Current password is incorrect",
    );
  }

  const passwordHash = await authUtils.hashPassword(newPassword);
  await authRepo.updateUserPassword(userId, passwordHash);
};

export const forgotPassword = async (email: string): Promise<void> => {
  const user = await authRepo.findUserByEmail(email);
  if (!user) {
    // Don't reveal whether email exists
    return;
  }

  // In production, send email with reset token
  const resetToken = authUtils.generateResetToken();
  // TODO: Store reset token in DB and send email
  console.log(`Password reset token for ${email}: ${resetToken}`);
};

export const resetPassword = async (
  token: string,
  newPassword: string,
): Promise<void> => {
  // TODO: Verify reset token from DB
  // This is a placeholder - implement with proper token storage
  throw new ApiError(
    httpStatus.NOT_IMPLEMENTED,
    "Password reset not fully implemented yet",
  );
};

export const verifyEmail = async (token: string): Promise<void> => {
  // TODO: Verify email token from DB
  // This is a placeholder - implement with proper token storage
  throw new ApiError(
    httpStatus.NOT_IMPLEMENTED,
    "Email verification not fully implemented yet",
  );
};
