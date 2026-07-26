import morgan from "morgan";
import { env } from "./env";

const stream = {
  write: (message: string) => {
    console.log(message.trim());
  },
};

const skip = () => {
  return env.nodeEnv === "test";
};

export const requestLogger = morgan(
  env.nodeEnv === "development" ? "dev" : "combined",
  { stream, skip }
);