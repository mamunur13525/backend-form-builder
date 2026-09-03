import { z } from "zod";

export const checkoutPlanSchema = {
  body: z.object({
    plan: z.enum(["pro", "team"]),
    interval: z.enum(["monthly", "yearly"]),
  }),
};
