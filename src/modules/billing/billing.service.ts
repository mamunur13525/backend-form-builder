/**
 * Billing service — all business logic for plans, checkout, subscription
 * lifecycle and Lemon Squeezy webhook processing. Controllers stay thin,
 * repositories do the queries, this file decides *what* happens.
 *
 * Webhooks are the source of truth: checkout success only redirects the buyer,
 * subscription state in MongoDB is written exclusively by webhook events
 * (plus an optimistic local sync after cancel/resume/change-plan so the UI is
 * not waiting for the next webhook round-trip).
 */
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { ISubscription, SubscriptionStatus } from "../../models/Subscription";
import * as billingRepo from "./billing.repository";
import * as lemonSqueezy from "./lemon-squeezy.client";
import {
  entitledStatuses,
  getVariantId,
  getVariantMap,
  plans,
} from "./billing.constants";
import {
  CheckoutPlanBody,
  CheckoutResponse,
  LemonSqueezyWebhookPayload,
  PlanId,
  SubscriptionResponse,
} from "./billing.types";
import { findUserById } from "../users/user.repository";
import { findUserByEmail } from "../auth/auth.repository";
import { countForms, findFormIdsByOwner } from "../forms/form.repository";
import { countResponsesSince } from "../responses/response.repository";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const stripUndefined = (data: Record<string, any>): Record<string, any> =>
  Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );

const serializeSubscription = (sub: ISubscription): SubscriptionResponse => ({
  plan: sub.plan,
  interval: sub.interval,
  status: sub.status,
  renewsAt: sub.renewsAt ? new Date(sub.renewsAt).toISOString() : null,
  endsAt: sub.endsAt ? new Date(sub.endsAt).toISOString() : null,
  cancelledAt: sub.cancelledAt ? new Date(sub.cancelledAt).toISOString() : null,
  cancelReason: sub.cancelReason ?? null,
  lastPaymentAt: sub.lastPaymentAt
    ? new Date(sub.lastPaymentAt).toISOString()
    : null,
  testMode: sub.testMode,
  createdAt: sub.createdAt
    ? new Date(sub.createdAt).toISOString()
    : new Date(0).toISOString(),
  updatedAt: sub.updatedAt
    ? new Date(sub.updatedAt).toISOString()
    : new Date(0).toISOString(),
});

/**
 * Whether the subscription still grants paid access. A cancelled subscription
 * keeps access until its paid period (`endsAt`) is over; past_due keeps access
 * as a dunning grace window.
 */
const isEntitled = (sub: ISubscription): boolean => {
  if (
    !entitledStatuses.includes(sub.status as (typeof entitledStatuses)[number])
  ) {
    return false;
  }
  if (
    sub.status === "cancelled" &&
    sub.endsAt &&
    sub.endsAt.getTime() <= Date.now()
  ) {
    return false;
  }
  return true;
};

const mapLsStatus = (lsStatus: string): SubscriptionStatus => {
  switch (lsStatus) {
    case "on_trial":
      return "on_trial";
    case "past_due":
      return "past_due";
    case "paused":
      return "paused";
    case "cancelled":
      return "cancelled";
    case "expired":
      return "expired";
    default:
      return "active";
  }
};
/** Resolves our account id from checkout custom data or the LS customer email. */
const resolveUserId = async (
  customUserId?: string,
  attrs?: Record<string, any>
): Promise<string | null> => {
  if (customUserId) {
    const user = await findUserById(String(customUserId));
    if (user) return String(user._id);
  }

  const lsCustomerId = attrs?.customer_id;
  if (lsCustomerId != null) {
    try {
      const customer = await lemonSqueezy.getCustomer(String(lsCustomerId));
      const email =
        customer?.attributes?.user_email ?? customer?.attributes?.email;
      if (email) {
        const user = await findUserByEmail(String(email));
        if (user) return String(user._id);
      }
    } catch {
      // Billing not configured / customer not found — fall through to null.
    }
  }
  return null;
};

/**
 * Writes subscription state from a Lemon Squeezy subscription object.
 * Finds the local row by LS subscription id, then by userId, and creates it
 * when neither exists — making every webhook idempotent and race-safe against
 * the unique `userId` index.
 *
 * Returns the updated document, or null when the variant is not one of ours.
 */
const syncSubscriptionFromLemonSqueezy = async (
  lsSubscription: { id: string; attributes: Record<string, any> },
  customUserId?: string
): Promise<ISubscription | null> => {
  const attrs = lsSubscription.attributes;
  const mapping = getVariantMap()[String(attrs.variant_id)];
  if (!mapping) {
    // Unknown variant — not one of our purchasable plans; ignore the event.
    console.warn(
      `Lemon Squeezy webhook for unknown variant ${attrs.variant_id} ignored.`
    );
    return null;
  }

  const status = mapLsStatus(String(attrs.status));
  const data = stripUndefined({
    plan: status === "expired" ? "free" : mapping.plan,
    interval: mapping.interval,
    status,
    lsSubscriptionId: String(lsSubscription.id),
    lsCustomerId:
      attrs.customer_id != null ? String(attrs.customer_id) : undefined,
    lsOrderId: attrs.order_id != null ? String(attrs.order_id) : undefined,
    lsVariantId: String(attrs.variant_id),
    renewsAt: attrs.renews_at ? new Date(attrs.renews_at) : undefined,
    endsAt: attrs.ends_at ? new Date(attrs.ends_at) : undefined,
    cancelledAt: attrs.cancelled
      ? new Date(attrs.ends_at ?? Date.now())
      : undefined,
    testMode: Boolean(attrs.test_mode),
  });

  const userId = await resolveUserId(customUserId, attrs);
  if (!userId) {
    console.warn(
      "Lemon Squeezy webhook could not be matched to an account (no custom data, unknown customer)."
    );
    return null;
  }

  const existing =
    (await billingRepo.findSubscriptionByLsId(String(lsSubscription.id))) ??
    (await billingRepo.findSubscriptionByUserId(userId));

  if (existing) {
    return billingRepo.updateSubscriptionById(String(existing._id), data);
  }
  return billingRepo.createSubscription({ userId, ...data });
};

/* -------------------------------------------------------------------------- */
/* Plans & subscription reads                                                 */
/* -------------------------------------------------------------------------- */

/** Public pricing-page data (no auth required). */
export const getPlans = () => ({
  currency: "USD",
  plans: Object.values(plans).map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    features: plan.features,
    limits: plan.limits,
    prices: {
      monthly: plan.prices.monthly === null ? null : plan.prices.monthly / 100,
      yearly: plan.prices.yearly === null ? null : plan.prices.yearly / 100,
    },
  })),
});

/** The plan an account effectively gets, considering grace/cancel windows. */
export const getEffectivePlan = async (userId: string): Promise<PlanId> => {
  const sub = await billingRepo.findSubscriptionByUserId(userId);
  if (sub && isEntitled(sub)) {
    return sub.plan;
  }
  return "free";
};

/** Current subscription of the authenticated account (free row created lazily). */
export const getMySubscription = async (
  userId: string
): Promise<SubscriptionResponse> => {
  let sub = await billingRepo.findSubscriptionByUserId(userId);
  if (!sub) {
    sub = await billingRepo.upsertFreeSubscription(userId);
  }
  return serializeSubscription(sub);
};

/* -------------------------------------------------------------------------- */
/* Checkout & subscription management                                         */
/* -------------------------------------------------------------------------- */

export const createCheckout = async (
  userId: string,
  data: CheckoutPlanBody
): Promise<CheckoutResponse> => {
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const existing = await billingRepo.findSubscriptionByUserId(userId);
  if (existing && isEntitled(existing) && existing.plan !== "free") {
    throw new ApiError(
      httpStatus.CONFLICT,
      "You already have an active subscription. Use change-plan to switch plans."
    );
  }

  const checkout = await lemonSqueezy.createCheckout({
    userId,
    userEmail: user.email,
    userName: user.name,
    plan: data.plan,
    interval: data.interval,
    redirectUrl: `${env.frontendUrl}/billing/success`,
  });

  if (!checkout.url) {
    throw new ApiError(
      httpStatus.BAD_GATEWAY,
      "Checkout could not be created. Please try again later."
    );
  }

  return { checkoutUrl: checkout.url, checkoutId: checkout.id };
};

/** Upgrade/downgrade between Pro and Team, monthly and yearly. */
export const changePlan = async (
  userId: string,
  data: CheckoutPlanBody
): Promise<SubscriptionResponse> => {
  const sub = await billingRepo.findSubscriptionByUserId(userId);
  if (!sub?.lsSubscriptionId || !isEntitled(sub)) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "No active subscription to change. Start a checkout instead."
    );
  }
  if (sub.status === "cancelled") {
    throw new ApiError(
      httpStatus.CONFLICT,
      "Resume your subscription before changing plans."
    );
  }
  if (sub.plan === data.plan && sub.interval === data.interval) {
    throw new ApiError(httpStatus.CONFLICT, "You are already on this plan.");
  }

  const variantId = getVariantId(data.plan, data.interval);
  if (!variantId) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Target plan is not configured."
    );
  }

  const lsSub = await lemonSqueezy.updateSubscription(sub.lsSubscriptionId, {
    variant_id: Number(variantId),
  });

  const updated = (await syncSubscriptionFromLemonSqueezy(lsSub, userId)) ?? sub;
  return serializeSubscription(updated);
};

/** Cancels at the end of the current billing period (Lemon Squeezy handles it). */
export const cancelSubscription = async (
  userId: string
): Promise<SubscriptionResponse> => {
  const sub = await billingRepo.findSubscriptionByUserId(userId);
  if (!sub?.lsSubscriptionId || !isEntitled(sub) || sub.status === "cancelled") {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "No active subscription to cancel."
    );
  }

  const lsSub = await lemonSqueezy.updateSubscription(sub.lsSubscriptionId, {
    cancelled: true,
  });

  const updated = (await syncSubscriptionFromLemonSqueezy(lsSub, userId)) ?? sub;
  return serializeSubscription(updated);
};

/** Reverts a cancellation before the period end. */
export const resumeSubscription = async (
  userId: string
): Promise<SubscriptionResponse> => {
  const sub = await billingRepo.findSubscriptionByUserId(userId);
  if (!sub?.lsSubscriptionId) {
    throw new ApiError(httpStatus.NOT_FOUND, "No subscription found.");
  }
  if (sub.status !== "cancelled") {
    throw new ApiError(httpStatus.CONFLICT, "Subscription is not cancelled.");
  }

  const lsSub = await lemonSqueezy.updateSubscription(sub.lsSubscriptionId, {
    cancelled: false,
  });

  const updated = (await syncSubscriptionFromLemonSqueezy(lsSub, userId)) ?? sub;
  return serializeSubscription(updated);
};

/** Lemon Squeezy customer portal URL (payment method, invoices, receipts). */
export const getPortalUrl = async (
  userId: string
): Promise<{ url: string }> => {
  const sub = await billingRepo.findSubscriptionByUserId(userId);
  if (!sub?.lsSubscriptionId) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "No subscription found for this account."
    );
  }

  const lsSub = await lemonSqueezy.getSubscription(sub.lsSubscriptionId);
  const url = lsSub?.attributes?.urls?.customer_portal;
  if (!url) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Customer portal is not available for this subscription."
    );
  }
  return { url };
};

/* -------------------------------------------------------------------------- */
/* Webhook event handling                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Dispatches a verified webhook event. Unknown events are acknowledged
 * without action so Lemon Squeezy does not retry them forever.
 */
export const handleWebhookEvent = async (
  payload: LemonSqueezyWebhookPayload
): Promise<void> => {
  const eventName = payload?.meta?.event_name;

  switch (eventName) {
    // Checkout data lands through subscription_created; orders need no action.
    case "order_created":
      return;

    case "subscription_created":
    case "subscription_updated":
    case "subscription_cancelled":
    case "subscription_resumed":
    case "subscription_paused":
    case "subscription_expired":
      await syncSubscriptionFromLemonSqueezy(
        payload.data,
        payload.meta.custom_data?.user_id
      );
      return;

    case "subscription_payment_success":
      await handlePaymentSuccess(payload);
      return;

    case "subscription_payment_failed":
      await setSubscriptionStatusFromInvoice(payload, "past_due");
      return;

    case "subscription_payment_recovered":
      await setSubscriptionStatusFromInvoice(payload, "active");
      return;

    case "subscription_payment_refunded":
      await setSubscriptionStatusFromInvoice(payload, "expired");
      return;

    default:
      return;
  }
};

const lsSubscriptionIdFromInvoice = (
  payload: LemonSqueezyWebhookPayload
): string | null => {
  const attrs = payload.data.attributes;
  return attrs.subscription_id != null ? String(attrs.subscription_id) : null;
};

/** Successful recurring/initial payment — keep the subscription active. */
const handlePaymentSuccess = async (
  payload: LemonSqueezyWebhookPayload
): Promise<void> => {
  const lsSubscriptionId = lsSubscriptionIdFromInvoice(payload);
  if (!lsSubscriptionId) return;

  const sub = await billingRepo.findSubscriptionByLsId(lsSubscriptionId);
  if (!sub) return; // Row is created by subscription_created; nothing to sync yet.

  const billedAt = payload.data.attributes.billed_at;
  await billingRepo.updateSubscriptionById(String(sub._id), {
    status: "active",
    lastPaymentAt: billedAt ? new Date(billedAt) : new Date(),
  });
};

const setSubscriptionStatusFromInvoice = async (
  payload: LemonSqueezyWebhookPayload,
  status: SubscriptionStatus
): Promise<void> => {
  const lsSubscriptionId = lsSubscriptionIdFromInvoice(payload);
  if (!lsSubscriptionId) return;

  const sub = await billingRepo.findSubscriptionByLsId(lsSubscriptionId);
  if (!sub) return;

  await billingRepo.updateSubscriptionById(String(sub._id), { status });
};

/* -------------------------------------------------------------------------- */
/* Plan gating (called from form/response services)                           */
/* -------------------------------------------------------------------------- */

/** Throws 403 when the account has reached its plan's form limit. */
export const assertCanCreateForm = async (userId: string): Promise<void> => {
  const plan = await getEffectivePlan(userId);
  const limit = plans[plan].limits.forms;
  if (limit === -1) return;

  const count = await countForms({ createdBy: userId });
  if (count >= limit) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `Your ${plans[plan].name} plan allows up to ${limit} forms. Upgrade to create more.`
    );
  }
};

/** Throws 403 when the form owner's plan monthly response limit is reached. */
export const assertCanAcceptResponse = async (
  formOwnerId: string
): Promise<void> => {
  const plan = await getEffectivePlan(formOwnerId);
  const limit = plans[plan].limits.responsesPerMonth;
  if (limit === -1) return;

  const formIds = await findFormIdsByOwner(formOwnerId);
  if (formIds.length === 0) return;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const used = await countResponsesSince(formIds, startOfMonth);
  if (used >= limit) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `This form reached the ${plans[plan].name} plan limit of ${limit} responses this month. The owner needs to upgrade.`
    );
  }
};


