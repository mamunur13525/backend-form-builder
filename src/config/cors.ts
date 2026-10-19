import { CorsOptions } from "cors";
import { env } from "./env";

const frontendOrigin = new URL(env.frontendUrl).origin;

export const corsOptions: CorsOptions = {
  origin: frontendOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Range", "X-Total-Count"],
};