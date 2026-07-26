export interface UpdateProfileBody {
  name?: string;
  avatarUrl?: string;
}

export interface UpdateUserBody {
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}