/**
 * Thin typed client for the Lemon Squeezy REST API (JSON:API).
 *
 * Only the handful of calls we need: checkout creation, subscription
 * retrieval/update (cancel / resume / plan change) and customer lookup.
 * Uses the global fetch (Node 18+) — no extra dependency required.
 *
 * https://docs.lemonsqueezy.com/api
 */
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { getVariantId } from "./billing.constants";
import { BillingInterval, PaidPlanId } from "./billing.types";

export interface CreateCheckoutOptions {
  userId: string;
  userEmail: string;
  userName?: string;
  plan: PaidPlanId;
  interval: BillingInterval;
  /** Where Lemon Squeezy sends the buyer after a successful purchase. */
  redirectUrl: string;
}

export interface CreatedCheckout {
  id: string;
  url: string;
}

const assertConfigured = (): void => {
  if (!env.lemonsqueezyApiKey || !env.lemonsqueezyStoreId) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Billing is not configured. Set LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_STORE_ID."
    );
  }
};

const lsRequest = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  assertConfigured();

  let response: Response;
  try {
    response = await fetch(`${env.lemonsqueezyApiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${env.lemonsqueezyApiKey}`,
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      httpStatus.BAD_GATEWAY,
      "Could not reach the payment provider. Please try again later."
    );
  }

  if (!response.ok) {
    // Body is read (and discarded) so the socket can be released; details are
    // logged for debugging without leaking them to the client.
    const detail = await response.text().catch(() => "");
    console.error(
      `Lemon Squeezy request failed: ${response.status} ${path} ${detail.slice(0, 500)}`
    );
    throw new ApiError(
      httpStatus.BAD_GATEWAY,
      "The payment provider rejected the request. Please try again later."
    );
  }

  return (await response.json()) as T;
};

/**
 * Creates a checkout for one of our product variants.
 *
 * The local account id is passed through as `checkout_data.custom.user_id`
 * and echoed back on every webhook as `meta.custom_data.user_id`, so we can
 * always activate the right account even if the buyer changes their email at
 * checkout.
 */
export const createCheckout = async (
  options: CreateCheckoutOptions
): Promise<CreatedCheckout> => {
  const variantId = getVariantId(options.plan, options.interval);
  if (!variantId) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "This plan is not configured for checkout. Set the LS_VARIANT_* environment variables."
    );
  }

  const json = await lsRequest<any>("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          product_options: {
            redirect_url: options.redirectUrl,
          },
          checkout_options: {
            embed: false,
          },
          checkout_data: {
            email: options.userEmail,
            ...(options.userName ? { name: options.userName } : {}),
            custom: { user_id: options.userId },
          },
        },
        relationships: {
          store: {
            data: { type: "stores", id: String(env.lemonsqueezyStoreId) },
          },
          variant: {
            data: { type: "variants", id: variantId },
          },
        },
      },
    }),
  });

  const attributes = json?.data?.attributes ?? {};
  return {
    id: json?.data?.id ?? "",
    url: attributes.url ?? "",
  };
};

/** GET /v1/subscriptions/:id */
export const getSubscription = async (lsSubscriptionId: string): Promise<any> => {
  const json = await lsRequest<any>(`/subscriptions/${lsSubscriptionId}`);
  return json?.data ?? null;
};

/**
 * PATCH /v1/subscriptions/:id
 * Supported attributes include `cancelled` (true/false), `variant_id`
 * (plan change) and `pause`.
 */
export const updateSubscription = async (
  lsSubscriptionId: string,
  attributes: Record<string, unknown>
): Promise<any> => {
  const json = await lsRequest<any>(`/subscriptions/${lsSubscriptionId}`, {
    method: "PATCH",
    body: JSON.stringify({
      data: {
        type: "subscriptions",
        id: lsSubscriptionId,
        attributes,
      },
    }),
  });
  return json?.data ?? null;
};

/** GET /v1/customers/:id — resolves an account when checkout custom data is absent. */
export const getCustomer = async (lsCustomerId: string): Promise<any> => {
  const json = await lsRequest<any>(`/customers/${lsCustomerId}`);
  return json?.data ?? null;
};
