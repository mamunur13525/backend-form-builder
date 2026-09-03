/**
 * Billing types — request bodies, API responses and the minimal shapes of the
 * Lemon Squeezy JSON:API objects we consume. One type per layer; never reused
 * across layers.
 */

/** Pricing tier identifiers (definitions live in billing.constants.ts). */
export type PlanId = "free" | "pro" | "team";
export type PaidPlanId = Exclude<PlanId, "free">;
export type BillingInterval = "monthly" | "yearly";

/** Body of POST /billing/checkout and POST /billing/change-plan. */
export interface CheckoutPlanBody {
  plan: PaidPlanId;
  interval: BillingInterval;
}

/** Public representation of the current account's subscription. */
export interface SubscriptionResponse {
  plan: PlanId;
  interval: BillingInterval;
  status: string;
  renewsAt: string | null;
  endsAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  lastPaymentAt: string | null;
  testMode: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Result of POST /billing/checkout. */
export interface CheckoutResponse {
  checkoutUrl: string;
  checkoutId: string;
}

/**
 * Attributes of the Lemon Squeezy `subscription` object we rely on.
 * https://docs.lemonsqueezy.com/api/subscriptions#the-subscription-object
 */
export interface LemonSqueezySubscriptionAttributes {
  store_id: number;
  customer_id: number;
  order_id: number;
  product_id: number;
  variant_id: number;
  product_name: string;
  variant_name: string;
  user_name: string;
  user_email: string;
  status: "on_trial" | "active" | "paused" | "past_due" | "cancelled" | "expired";
  cancelled: boolean;
  trial_ends_at: string | null;
  pause?: { mode: "void" | "free" | null; resumes_at: string | null } | null;
  renews_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  test_mode?: boolean;
  urls?: {
    update_payment_method?: string;
    customer_portal?: string;
  };
  [key: string]: unknown;
}

/**
 * Webhook payload. `data.attributes` differs per event (subscription,
 * subscription-invoice, order, ...), so it is kept loose and narrowed in the
 * event handlers.
 */
export interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: string;
    webhook_id?: string;
    test_mode?: boolean;
    /** Custom data passed at checkout — carries our `user_id` passthrough. */
    custom_data?: {
      user_id?: string;
      [key: string]: unknown;
    };
  };
  data: {
    type: string;
    id: string;
    attributes: Record<string, any>;
  };
}
