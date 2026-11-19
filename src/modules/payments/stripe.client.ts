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
      "Stripe could not process this request. Please try again later."
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
  url?: string | null;
  status: string | null;
  payment_status: string;
  amount_total: number | null;
  currency: string | null;
  payment_intent?: string | null;
  metadata?: Record<string, string> | null;
  customer_details?: { email?: string | null } | null;
}

export interface StripeAccountResult {
  id: string;
  country?: string;
  email?: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  requirements?: { currently_due?: string[]; disabled_reason?: string | null };
}

export interface StripeRefundResult {
  id: string;
  amount: number;
  currency?: string;
  status: string;
  payment_intent?: string | null;
}

/** Fetch the connected account so we only enable payments Stripe will accept. */
export const retrieveAccount = (accountId: string): Promise<StripeAccountResult> =>
  stripeRequest<StripeAccountResult>(
    `${env.stripeApiBaseUrl}/v1/accounts/${encodeURIComponent(accountId)}`,
    { method: "GET" }
  );

/**
 * Hosted onboarding link for an account that still owes Stripe information.
 * Unlike OAuth, this is the flow that collects the missing requirements.
 */
export const createAccountOnboardingLink = (
  accountId: string,
  urls: { refreshUrl: string; returnUrl: string }
): Promise<{ url: string }> =>
  stripeRequest<{ url: string }>(
    `${env.stripeApiBaseUrl}/v1/account_links`,
    {
      method: "POST",
      body: toFormBody({
        account: accountId,
        type: "account_onboarding",
        refresh_url: urls.refreshUrl,
        return_url: urls.returnUrl,
      }),
    }
  );

/** Short-lived link into the connected account's own Stripe dashboard. */
export const createDashboardLink = (accountId: string): Promise<{ url: string }> =>
  stripeRequest<{ url: string }>(
    `${env.stripeApiBaseUrl}/v1/accounts/${encodeURIComponent(accountId)}/login_links`,
    { method: "POST" }
  );

/** Create a refund inside the connected account (direct charge context). */
export const createRefund = (
  accountId: string,
  params: { paymentIntentId: string; amountMinor?: number; reason?: string }
): Promise<StripeRefundResult> =>
  stripeRequest<StripeRefundResult>(
    `${env.stripeApiBaseUrl}/v1/refunds`,
    {
      method: "POST",
      body: toFormBody({
        payment_intent: params.paymentIntentId,
        amount: params.amountMinor,
        reason: params.reason,
      }),
    },
    accountId
  );

/** Revoke the platform's access; the owner's Stripe account itself is untouched. */
export const deauthorizeAccount = async (accountId: string): Promise<void> => {
  await stripeRequest<Record<string, unknown>>(
    `${env.stripeConnectBaseUrl}/oauth/deauthorize`,
    {
      method: "POST",
      body: toFormBody({
        client_id: env.stripeClientId,
        stripe_user_id: accountId,
      }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );
};

/** Create a hosted Checkout Session on the connected account. */
export const createCheckoutSession = (
  accountId: string,
  params: {
    currency: string;
    amount: number;
    title: string;
    formTitle?: string;
    description?: string;
    allowInstallments: boolean;
    email?: string;
    applicationFeeMinor?: number;
    idempotencyKey?: string;
    metadata: Record<string, string>;
    successUrl: string;
    cancelUrl: string;
  }
): Promise<CheckoutSession> =>
  stripeRequest<CheckoutSession>(
    `${env.stripeApiBaseUrl}/v1/checkout/sessions`,
    {
      method: "POST",
      ...(params.idempotencyKey
        ? { headers: { "Idempotency-Key": params.idempotencyKey } }
        : {}),
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
              product_data: {
                name: params.title || params.formTitle || "Payment",
                ...(params.description
                  ? { description: params.description }
                  : params.formTitle && params.formTitle !== params.title
                    ? { description: `From ${params.formTitle}` }
                    : {}),
              },
            },
          },
        ],
        ...(params.email || params.applicationFeeMinor
          ? {
              payment_intent_data: {
                ...(params.email ? { receipt_email: params.email } : {}),
                // Direct charges: the platform fee is taken in the connected
                // account's context; the owner pays processing fees.
                ...(params.applicationFeeMinor
                  ? { application_fee_amount: params.applicationFeeMinor }
                  : {}),
              },
            }
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
