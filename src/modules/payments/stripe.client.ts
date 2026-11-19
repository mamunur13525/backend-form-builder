/**
 * Thin Stripe REST client for Connect + Checkout. Uses the global fetch
 * (Node 18+) so no SDK dependency is needed.
 *
 * https://docs.stripe.com/connect/oauth-reference
 * https://docs.stripe.com/api/checkout/sessions
 */
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";

export const isStripeConfigured = (): boolean =>
  Boolean(env.stripeSecretKey && env.stripeClientId);

const assertConfigured = (): void => {
  if (!env.stripeSecretKey) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Payments are not configured. Set STRIPE_SECRET_KEY and STRIPE_CLIENT_ID."
    );
  }
};

/** Stripe expects nested params as `a[b][0][c]`, not JSON. */
function toFormBody(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  const walk = (value: unknown, prefix: string) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${prefix}[${index}]`));
      return;
    }
    if (typeof value === "object") {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        walk(child, prefix ? `${prefix}[${key}]` : key);
      }
      return;
    }
    search.append(prefix, String(value));
  };
  walk(params, "");
  return search.toString();
}

const stripeRequest = async <T>(
  url: string,
  init: RequestInit,
  accountId?: string
): Promise<T> => {
  assertConfigured();

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${env.stripeSecretKey}`,
        ...(accountId ? { "Stripe-Account": accountId } : {}),
        ...(init.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      httpStatus.BAD_GATEWAY,
      "Could not reach Stripe. Please try again later."
    );
  }

  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(
      `Stripe request failed: ${response.status} ${url} ${JSON.stringify(data).slice(0, 500)}`
    );
    throw new ApiError(
      httpStatus.BAD_GATEWAY,
      data?.error?.message || "Stripe rejected the request. Please try again later."
    );
  }
  return data as T;
};

/** OAuth screen URL the owner is sent to when connecting their account. */
export const buildConnectUrl = (state: string): string => {
  if (!env.stripeClientId) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Stripe Connect is not configured. Set STRIPE_CLIENT_ID."
    );
  }
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.stripeClientId,
    scope: "read_write",
    state,
    redirect_uri: env.stripeRedirectUri,
  });
  return `${env.stripeConnectBaseUrl}/oauth/authorize?${params.toString()}`;
};

/** Exchange the OAuth code for the connected account id. */
export const exchangeConnectCode = async (code: string): Promise<string> => {
  assertConfigured();
  let response: Response;
  try {
    response = await fetch(`${env.stripeConnectBaseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: toFormBody({
        grant_type: "authorization_code",
        client_secret: env.stripeSecretKey,
        code,
      }),
    });
  } catch {
    throw new ApiError(
      httpStatus.BAD_GATEWAY,
      "Could not reach Stripe. Please try again later."
    );
  }
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok || !data?.stripe_user_id) {
    console.error(
      `Stripe OAuth failed: ${response.status} ${JSON.stringify(data).slice(0, 500)}`
    );
    throw new ApiError(httpStatus.BAD_GATEWAY, "Stripe did not authorize the account.");
  }
  return String(data.stripe_user_id);
};

export interface CheckoutSession {
  id: string;
  url: string;
}

export interface CheckoutSessionResult {
  id: string;
  status: string | null;
  payment_status: string;
  amount_total: number | null;
  currency: string | null;
  metadata?: Record<string, string> | null;
  customer_details?: { email?: string | null } | null;
}

/** Create a hosted Checkout Session on the connected account. */
export const createCheckoutSession = (
  accountId: string,
  params: {
    currency: string;
    amount: number;
    title: string;
    allowInstallments: boolean;
    email?: string;
    metadata: Record<string, string>;
    successUrl: string;
    cancelUrl: string;
  }
): Promise<CheckoutSession> =>
  stripeRequest<CheckoutSession>(
    `${env.stripeApiBaseUrl}/v1/checkout/sessions`,
    {
      method: "POST",
      body: toFormBody({
        mode: "payment",
        // Omitting payment_method_types enables the account's dynamic methods
        // (which include Klarna/Afterpay); card-only when installments are off.
        ...(params.allowInstallments ? {} : { payment_method_types: ["card"] }),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: params.currency,
              unit_amount: params.amount,
              product_data: { name: params.title || "Payment" },
            },
          },
        ],
        ...(params.email
          ? { payment_intent_data: { receipt_email: params.email } }
          : {}),
        metadata: params.metadata,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
      }),
    },
    accountId
  );

/** Retrieve a Checkout Session so we can trust its paid status. */
export const retrieveCheckoutSession = (
  accountId: string,
  sessionId: string
): Promise<CheckoutSessionResult> =>
  stripeRequest<CheckoutSessionResult>(
    `${env.stripeApiBaseUrl}/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { method: "GET" },
    accountId
  );
