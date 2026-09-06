# Billing API Documentation (Lemon Squeezy)

Payments and subscriptions for the Form Builder are powered by [Lemon Squeezy](https://www.lemonsqueezy.com) (a Stripe company), used as **Merchant of Record (MoR)**: Lemon Squeezy hosts the checkout, collects the payment, and handles global VAT/sales tax, invoices, refunds and compliance — the backend never touches card data.

**Base URL:** `{API_ORIGIN}/api/v1/billing`  
**Default dev:** `http://localhost:5000/api/v1/billing`

---

## How the integration works

```
Pricing page (frontend)
   │  POST /api/v1/billing/checkout
   ▼
Lemon Squeezy hosted checkout  ──buyer pays──►  Lemon Squeezy webhooks
   │                                                │
   └─ redirect → {FRONTEND_URL}/billing/success     ▼  POST /api/v1/billing/webhook
                                                    │  (HMAC-SHA256 verified)
                                                    ▼
                                        subscriptions collection updated
                                                    │
                                        plan limits enforced app-wide
```

- The buyer is redirected to a hosted Lemon Squeezy checkout with their email prefilled and our account id embedded (`checkout_data.custom.user_id`).
- A successful purchase only **redirects** the buyer back to the app — it never mutates the database directly.
- Subscription state is written **exclusively by verified webhook events**, so a spoofed "I paid" request can never unlock a plan.

---

## 1. One-time Lemon Squeezy dashboard setup

1. Create a store at <https://app.lemonsqueezy.com> (start in **Test mode**).
2. Create a product named **Form Builder Pro** with four subscription variants:

   | Variant | Price | Grants |
   |---|---|---|
   | Pro Monthly | $19 | `pro` · `monthly` |
   | Pro Yearly | $190 | `pro` · `yearly` |
   | Team Monthly | $49 | `team` · `monthly` |
   | Team Yearly | $490 | `team` · `yearly` |

3. Copy the four **variant IDs** (Products → Form Builder Pro → variants).
4. **Settings → API** → create an API key.
5. **Settings → Webhooks** → add a webhook:
   - **Callback URL:** `https://<your-api-domain>/api/v1/billing/webhook`
   - **Signing secret:** any random string (6–40 characters)
   - **Events:** `order_created`, `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_paused`, `subscription_expired`, `subscription_payment_success`, `subscription_payment_failed`, `subscription_payment_recovered`, `subscription_payment_refunded`
6. Fill the variables in `.env` (below) and restart the API.

---

## 2. Environment variables

| Variable | Source | Purpose |
|---|---|---|
| `LEMONSQUEEZY_API_KEY` | Settings → API | Bearer key for the Lemon Squeezy REST API |
| `LEMONSQUEEZY_STORE_ID` | Settings → Stores | Numeric store id used when creating checkouts |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Settings → Webhooks | HMAC-SHA256 signing secret (raw-body verification) |
| `LS_VARIANT_PRO_MONTHLY` | Product → variant ID | Checkout + webhook mapping → `pro`, `monthly` |
| `LS_VARIANT_PRO_YEARLY` | Product → variant ID | Checkout + webhook mapping → `pro`, `yearly` |
| `LS_VARIANT_TEAM_MONTHLY` | Product → variant ID | Checkout + webhook mapping → `team`, `monthly` |
| `LS_VARIANT_TEAM_YEARLY` | Product → variant ID | Checkout + webhook mapping → `team`, `yearly` |

> ⚠️ **Behavior when unconfigured:** checkout/change-plan/cancel/resume/portal answer `503` with a clear message, and webhooks answer `503` until the signing secret is set. Nothing crashes — billing is simply unavailable.

The variant→plan mapping is defined in `src/modules/billing/billing.constants.ts` and read from the environment at call time (tests can inject their own IDs).


## 3. Plans, prices and limits

Plans are defined once in `src/modules/billing/billing.constants.ts` — prices, features and limits all live there, and `GET /billing/plans` serves them to the pricing page.

| Plan | Monthly | Yearly | Forms | Responses / month | Workspace members |
|---|---|---|---|---|---|
| Free | $0 | $0 | 3 | 100 | 1 |
| Pro | $19 | $190 | Unlimited | 10,000 | 1 |
| Team | $49 | $490 | Unlimited | 100,000 | 10 |

Yearly = 10× monthly (two months free). Prices are stored in **cents** (`1900`, `19000`, …) and divided by 100 for the API response.

Subscription statuses: `free | active | on_trial | past_due | cancelled | expired | paused`.

**Access rules** (who gets paid features):

- `active`, `on_trial` — always grant the plan.
- `past_due` — keeps access during the dunning grace window.
- `cancelled` — keeps access until `endsAt` (the paid period they already bought), then effectively free.
- `expired`, `paused`, `free` — no paid access.

---

## 4. Endpoints

### GET /billing/plans
Public pricing data for the pricing page. **No authentication.**

**Response (200):**
```json
{
  "success": true,
  "message": "Plans retrieved successfully",
  "data": {
    "currency": "USD",
    "plans": [
      {
        "id": "pro",
        "name": "Pro",
        "description": "For professionals who need unlimited forms and more responses.",
        "features": ["Unlimited forms", "10,000 responses / month"],
        "limits": { "forms": -1, "responsesPerMonth": 10000, "workspaceMembers": 1 },
        "prices": { "monthly": 19, "yearly": 190 }
      }
    ]
  }
}
```
(`-1` means unlimited)

### GET /billing/subscription
The current account's subscription. A new account implicitly gets the `free` plan (the row is created lazily on first read).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Subscription retrieved successfully",
  "data": {
    "plan": "pro",
    "interval": "monthly",
    "status": "active",
    "renewsAt": "2026-10-03T00:00:00.000Z",
    "endsAt": null,
    "cancelledAt": null,
    "cancelReason": null,
    "lastPaymentAt": "2026-09-03T01:00:00.000Z",
    "testMode": false,
    "createdAt": "…",
    "updatedAt": "…"
  }
}
```

### POST /billing/checkout
Creates a Lemon Squeezy checkout for a plan/interval and returns the hosted checkout URL. The account id travels inside the checkout as `checkout_data.custom.user_id` and is echoed back on every webhook as `meta.custom_data.user_id` — so the right account is activated even if the buyer edits their email at checkout. After payment Lemon Squeezy redirects to `{FRONTEND_URL}/billing/success`.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{ "plan": "pro", "interval": "monthly" }
```
(`plan`: `pro | team` — `interval`: `monthly | yearly`)

**Response (201):**
```json
{
  "success": true,
  "message": "Checkout created successfully",
  "data": {
    "checkoutUrl": "https://<store>.lemonsqueezy.com/checkout/custom/…",
    "checkoutId": "…"
  }
}
```

**Errors:** `409` account already has an active subscription (use change-plan) · `422` validation failed · `503` billing not configured.

---


### POST /billing/change-plan
Upgrades/downgrades an active subscription (e.g. Pro monthly → Team yearly). Proration is handled by Lemon Squeezy. Implemented as a `PATCH /v1/subscriptions/:id` with the new `variant_id`; the returned subscription is synced locally and a webhook confirms the change.

**Headers:** `Authorization: Bearer <token>`

**Request Body:** same shape as checkout — `{ "plan": "team", "interval": "yearly" }`

**Response (200):** the updated subscription object (same shape as `GET /billing/subscription`).

**Errors:** `404` no active subscription (start a checkout instead) · `409` already on that plan, or the subscription is cancelled (resume first) · `503` target plan not configured.

### POST /billing/cancel
Cancels at the end of the current billing period (`PATCH` with `cancelled: true`). Paid access continues until `endsAt` — the buyer keeps what they paid for.

**Headers:** `Authorization: Bearer <token>`

**Response (200):** subscription with `status: "cancelled"` and `endsAt` set.

### POST /billing/resume
Reverts a scheduled cancellation before the period ends (`PATCH` with `cancelled: false`).

**Headers:** `Authorization: Bearer <token>`

**Errors:** `404` no subscription · `409` subscription is not cancelled.

### GET /billing/portal
Returns the Lemon Squeezy **customer portal** URL where the buyer can update their payment method and download invoices/receipts. Read from the live subscription object (`attributes.urls.customer_portal`).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Customer portal URL retrieved successfully",
  "data": { "url": "https://<store>.lemonsqueezy.com/billing/…" }
}
```

---


## 5. Webhooks

**`POST /billing/webhook`** — called by Lemon Squeezy only; never call it yourself.

**Authentication:** no JWT. Every request carries an `X-Signature` header = HMAC-SHA256 of the **raw request body** using `LEMONSQUEEZY_WEBHOOK_SECRET`. The backend verifies it with `crypto.timingSafeEqual` over the exact bytes (stashed by the `verify` callback of `express.json` in `src/app.ts`) and answers `401` on mismatch.

**Handled events → state changes** (`src/modules/billing/billing.service.ts`):

| Event | Effect |
|---|---|
| `subscription_created` | Upserts the subscription row, maps plan + interval from the LS variant id, stores LS ids, sets `renewsAt` |
| `subscription_updated` | Same sync — covers upgrades/downgrades (variant change), pauses, cancellations |
| `subscription_cancelled` | `status: "cancelled"`, `endsAt` keeps paid access until period end |
| `subscription_resumed` | Back to `active` |
| `subscription_paused` | `status: "paused"` (no paid access) |
| `subscription_expired` | `status: "expired"`, plan resets to `free` |
| `subscription_payment_success` | `active` + `lastPaymentAt` (period rollover) |
| `subscription_payment_failed` | `past_due` (grace access continues) |
| `subscription_payment_recovered` | Back to `active` |
| `subscription_payment_refunded` | `expired` (anti-abuse: plan resets to free) |
| `order_created` | No-op — activation is driven by `subscription_created` |
| anything else | Acknowledged with `200`, no action |

**Delivery guarantees:** every handler is idempotent (replayed events are safe — state is upserted by LS subscription id / account), the account is resolved from `meta.custom_data.user_id` (checkout passthrough) with a customer-email lookup as fallback, and the endpoint answers `200` quickly so Lemon Squeezy does not retry.

---

## 6. Plan gating

| Action | Enforcement | Limit source |
|---|---|---|
| `POST /forms` | `assertCanCreateForm` — form count vs plan limit | `limits.forms` (Free 3, Pro/Team ∞) |
| `POST /public/forms/:slug/submit` | `assertCanAcceptResponse` — responses this calendar month across the owner's forms | `limits.responsesPerMonth` (Free 100, Pro 10,000, Team 100,000) |
| Future premium endpoints | `requirePlan('pro', 'team')` middleware (`src/middlewares/plan.middleware.ts`) | — |

Exceeding a limit answers `403` with an upgrade-oriented message, e.g. *"Your Free plan allows up to 3 forms. Upgrade to create more."*

---

## 7. Testing

**Test mode:** create the API key, webhook and variants in Lemon Squeezy **Test mode** and use those values in `.env`. Purchases can use the test card `4242 4242 4242 4242` (any future expiry/CVC). Test subscriptions arrive with `test_mode: true`, which is stored on the subscription row.

**Simulating webhooks without the dashboard:** POST a signed payload to `/api/v1/billing/webhook`:

```bash
BODY='{"meta":{"event_name":"subscription_created","custom_data":{"user_id":"<userId>"}},"data":{"type":"subscriptions","id":"sub_1","attributes":{"variant_id":<variantId>,"status":"active","renews_at":"2026-10-03T00:00:00.000Z","ends_at":null,"cancelled":false,"customer_id":1,"order_id":1,"test_mode":true}}}'

SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$LEMONSQUEEZY_WEBHOOK_SECRET" -hex | sed 's/^.* //')

curl -X POST http://localhost:5000/api/v1/billing/webhook \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIG" \
  -d "$BODY"
```

**Automated suite** (`src/tests/billing.test.ts`, 15 tests): signature rejection (missing/invalid/wrong secret), activation from `subscription_created`, idempotent replay, expiry downgrade, `past_due` on failed payment, `lastPaymentAt` on successful payment, unknown-event acknowledgement, checkout validation/unconfigured behavior, and the Free-plan 3-form limit.

```bash
npx jest src/tests/billing.test.ts
```

**Go live:** switch the store to live mode, replace the API key/store id/webhook secret/variant IDs with the live values, and update the webhook callback URL to the production domain.

---

## Code map

| File | Role |
|---|---|
| `src/modules/billing/billing.constants.ts` | Plan definitions (prices/features/limits) + env variant mapping |
| `src/modules/billing/billing.types.ts` | Layer-specific types (requests, responses, LS payloads) |
| `src/modules/billing/lemon-squeezy.client.ts` | Typed LS REST client (fetch — no extra dependency) |
| `src/modules/billing/billing.repository.ts` | All subscription DB queries |
| `src/modules/billing/billing.service.ts` | Business logic: plans, checkout, lifecycle, webhook state machine, limits |
| `src/modules/billing/billing.webhook.ts` | HMAC signature verification |
| `src/modules/billing/billing.controller.ts` | Thin HTTP handlers |
| `src/modules/billing/billing.route.ts` | Routes (`/plans`, `/webhook` public; rest JWT) |
| `src/models/Subscription.ts` | `subscriptions` collection schema |
| `src/middlewares/plan.middleware.ts` | `requirePlan(...)` gating middleware |

---
