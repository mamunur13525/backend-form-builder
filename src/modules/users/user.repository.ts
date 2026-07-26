import { User, IUser } from "../../models/User";

export const findAllUsers = async (
  skip: number,
  limit: number,
  sort: Record<string, 1 | -1>,
  filter: Record<string, any> = {}
): Promise<IUser[]> => {
  return User.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .select("-passwordHash");
};

export const countUsers = async (filter: Record<string, any> = {}): Promise<number> => {
  return User.countDocuments(filter);
};

export const findUserById = async (id: string): Promise<IUser | null> => {
  return User.findById(id).select("-passwordHash");
};

export const updateUser = async (
  id: string,
  data: Record<string, any>
): Promise<IUser | null> => {
  return User.findByIdAndUpdate(id, data, { new: true }).select("-passwordHash");
};

export const deleteUser = async (id: string): Promise<IUser | null> => {
  return User.findByIdAndDelete(id);
};