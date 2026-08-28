import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || "5000", 10),
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/typeform",
  jwtSecret: process.env.JWT_SECRET || "super-secret-key-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "refresh-secret-key-change-in-production",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "5242880", 10), // 5MB
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || "15", 10), // minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  // ImageKit — server-side upload via the REST API. Only the private key is
  // strictly required for uploading; the public key / URL endpoint are kept for
  // completeness (client SDK, signed URLs, transformations).
  imagekitPrivateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  imagekitPublicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
  imagekitUrlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
} as const;
