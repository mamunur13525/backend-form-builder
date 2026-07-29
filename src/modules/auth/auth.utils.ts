import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { env } from "../../config/env";
import { nanoid } from "nanoid";

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, env.bcryptSaltRounds);
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateAccessToken = (payload: {
  userId: string;
  email: string;
  role: string;
  name: string;
}): string => {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: {
  userId: string;
  email: string;
  role: string;
  name: string;
}): string => {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiresIn } as jwt.SignOptions);
};

export const verifyRefreshToken = (token: string): any => {
  return jwt.verify(token, env.jwtRefreshSecret);
};

export const generateResetToken = (): string => {
  return nanoid();
};

export const generateVerificationToken = (): string => {
  return nanoid();
};

export const generateTokenExpiry = (hours = 1): Date => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
};

const googleClient = new OAuth2Client(env.googleClientId);

export interface GoogleTokenPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

export const verifyGoogleToken = async (
  idToken: string
): Promise<GoogleTokenPayload> => {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.googleClientId,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error("Invalid Google token payload");
  }

  return {
    sub: payload.sub,
    email: payload.email || "",
    name: payload.name || "",
    picture: payload.picture,
    email_verified: payload.email_verified || false,
  };
};
