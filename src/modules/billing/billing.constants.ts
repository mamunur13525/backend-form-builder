/**
 * Billing constants — pricing tier definitions and the mapping between our
 * plans and the Lemon Squeezy product variants.
 *
 * The variant ids are read from the environment at call time (not at module
 * load) so tests can inject their own ids.
 *
 * Lemon Squeezy dashboard setup (one product, four subscription variants):
 *   Pro  — Monthly $19 / Yearly $190
 *   Team — Monthly $49 / Yearly $490
 */
import { BillingInterval, PaidPlanId, PlanId } from "./billing.types";

export interface PlanLimits {
  /** Max number of forms the account can create. -1 = unlimited. */
  forms: number;
  /** Max responses accepted per calendar month across all forms. -1 = unlimited. */
  responsesPerMonth: number;
  /** Max workspace members. -1 = unlimited. */
  workspaceMembers: number;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  description: string;
  /** Price in cents. null = not purchasable. */
  prices: { monthly: number | null; yearly: number | null };
  features: string[];
  limits: PlanLimits;
}

export const plans: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    description: "For personal projects and trying Form Builder out.",
    prices: { monthly: 0, yearly: 0 },
    features: [
      "3 forms",
      "100 responses / month",
      "1 workspace member",
      "All question types",
    ],
    limits: { forms: 3, responsesPerMonth: 100, workspaceMembers: 1 },
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For professionals who need unlimited forms and more responses.",
    prices: { monthly: 1900, yearly: 19000 },
    features: [
      "Unlimited forms",
      "10,000 responses / month",
      "Custom themes & branding",
      "Form logic & calculated fields",
      "CSV export",
      "Priority email support",
    ],
    limits: { forms: -1, responsesPerMonth: 10000, workspaceMembers: 1 },
  },
  team: {
    id: "team",
    name: "Team",
    description: "For teams that build forms together.",
    prices: { monthly: 4900, yearly: 49000 },
    features: [
      "Everything in Pro",
      "100,000 responses / month",
      "10 workspace members",
      "Team collaboration",
      "Priority support",
    ],
    limits: { forms: -1, responsesPerMonth: 100000, workspaceMembers: 10 },
  },
};

/** The plans that can be purchased through Lemon Squeezy. */
export const purchasablePlans: readonly PaidPlanId[] = ["pro", "team"];

const variantIdFromEnv = (key: string): string => {
  const value = process.env[key];
  return value ? String(value).trim() : "";
};

export interface VariantMapping {
  plan: PaidPlanId;
  interval: BillingInterval;
}

/**
 * Maps a Lemon Squeezy variant id to the plan/interval it grants. Rebuilt on
 * every call so webhook handlers and tests always see fresh env values.
 */
export const getVariantMap = (): Record<string, VariantMapping> => {
  const map: Record<string, VariantMapping> = {};
  const proMonthly = variantIdFromEnv("LS_VARIANT_PRO_MONTHLY");
  const proYearly = variantIdFromEnv("LS_VARIANT_PRO_YEARLY");
  const teamMonthly = variantIdFromEnv("LS_VARIANT_TEAM_MONTHLY");
  const teamYearly = variantIdFromEnv("LS_VARIANT_TEAM_YEARLY");

  if (proMonthly) map[proMonthly] = { plan: "pro", interval: "monthly" };
  if (proYearly) map[proYearly] = { plan: "pro", interval: "yearly" };
  if (teamMonthly) map[teamMonthly] = { plan: "team", interval: "monthly" };
  if (teamYearly) map[teamYearly] = { plan: "team", interval: "yearly" };

  return map;
};

/** Reverse lookup: variant id for a plan/interval, or null when unconfigured. */
export const getVariantId = (
  plan: PaidPlanId,
  interval: BillingInterval
): string | null => {
  const key =
    plan === "pro" && interval === "monthly"
      ? "LS_VARIANT_PRO_MONTHLY"
      : plan === "pro" && interval === "yearly"
        ? "LS_VARIANT_PRO_YEARLY"
        : plan === "team" && interval === "monthly"
          ? "LS_VARIANT_TEAM_MONTHLY"
          : "LS_VARIANT_TEAM_YEARLY";
  const id = variantIdFromEnv(key);
  return id || null;
};

/**
 * Subscription statuses that still grant paid-plan access.
 * `cancelled` keeps access until `endsAt` passes (handled in billing.service).
 * `past_due` keeps access as a dunning grace period.
 */
export const entitledStatuses = [
  "active",
  "on_trial",
  "past_due",
  "cancelled",
] as const;
