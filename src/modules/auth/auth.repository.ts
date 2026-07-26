import { User, IUser } from "../../models/User";

export const findUserByEmail = async (email: string): Promise<IUser | null> => {
  return User.findOne({ email: email.toLowerCase() });
};

export const findUserById = async (id: string): Promise<IUser | null> => {
  return User.findById(id);
};

export const findUserByGoogleId = async (
  googleId: string
): Promise<IUser | null> => {
  return User.findOne({ googleId });
};

export const createUser = async (data: {
  name: string;
  email: string;
  passwordHash?: string;
  googleId?: string;
  provider: "email" | "google";
  avatarUrl?: string;
}): Promise<IUser> => {
  return User.create(data);
};

export const updateGoogleId = async (
  id: string,
  googleId: string,
  avatarUrl?: string
): Promise<IUser | null> => {
  const update: any = { googleId, provider: "google" };
  if (avatarUrl) {
    update.avatarUrl = avatarUrl;
  }
  return User.findByIdAndUpdate(id, update, { new: true });
};

export const updateUserPassword = async (
  id: string,
  passwordHash: string
): Promise<IUser | null> => {
  return User.findByIdAndUpdate(id, { passwordHash }, { new: true });
};

export const markEmailAsVerified = async (
  id: string
): Promise<IUser | null> => {
  return User.findByIdAndUpdate(id, { isEmailVerified: true }, { new: true });
};

export const updateLastLogin = async (id: string): Promise<void> => {
  await User.findByIdAndUpdate(id, { lastLoginAt: new Date() });
};

export const updateAvatar = async (
  id: string,
  avatarUrl: string
): Promise<IUser | null> => {
  return User.findByIdAndUpdate(id, { avatarUrl }, { new: true });
};
