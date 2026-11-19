# Page Settings & New Page Types — Frontend Guide

Companion to `docs/form-pages-api.md`. Covers only what changed: the new page types, the new `coverImage` property, and the new per-type `settings` object.

**Endpoints are unchanged.** Everything below is sent/received through the existing routes:

- `POST /forms/:formId/pages`
- `PATCH /forms/:formId/pages/:pageId`

---

## 1. What's new on every page

Two new properties exist on all page objects:

```jsonc
{
  "coverImage": { "url": "https://…/cover.png", "fileId": "abc123", "alt": "" },
  "settings": { /* only the group for this page's type — see §3 */ }
}
```

**`coverImage`** — available on every type. Upload via the existing `POST /uploads` endpoint, then send the returned `url`/`fileId` here.

| Sending | Result |
|---|---|
| `"coverImage": { "url": "…" }` | Sets/replaces the image |
| `"coverImage": null` | **Clears** the image |
| key omitted | Left unchanged |

**`settings`** — a namespaced object. Only the group belonging to the page's type is stored; everything else is stripped server-side.

---

## 2. Page types

```
shortText  longText  email  phone  number  date  time
radio  checkbox  select  multiSelect  dropdown
file  rating  yesNo  url
statement  address  opinionScale  nps  signature  matrix
meeting  payment
```

Newly added: **`statement`**, **`dropdown`**, **`address`**, **`opinionScale`**, **`nps`**, **`signature`**, **`matrix`**, **`meeting`**, **`payment`**.

Types with **no** settings group (only `required` + `coverImage`): `shortText`, `url`, `date`, `time`, `dropdown`, `signature`, `yesNo`, `number`, `longText`.

> `number` and `longText` have no settings group because their min/max limits live in the existing **`validation`** object, not in `settings`. See §4.

---

## 3. Settings by page type

The group name is **not** the type name — `select`, `multiSelect`, `radio` and `checkbox` all share the `choice` group.

| Type | `settings` group |
|---|---|
| `email` | `email` |
| `phone` | `phone` |
| `statement` | `statement` |
| `meeting` | `meeting` |
| `select` / `multiSelect` / `radio` / `checkbox` | `choice` |
| `address` | `address` |
| `rating` | `rating` |
| `opinionScale` | `opinionScale` |
| `nps` | `nps` |
| `file` | `upload` |
| `matrix` | `matrix` |
| `payment` | `payment` |

### email
```json
{ "settings": { "email": { "businessEmailsOnly": false, "emailVerification": false } } }
```

### phone
```json
{
  "settings": {
    "phone": {
      "phoneVerification": false,
      "countryCodeMode": "auto",
      "defaultCountry": { "iso2": "BD", "name": "Bangladesh", "dialCode": "+880" }
    }
  }
}
```
`countryCodeMode` is `"auto"` or `"specific"`. When `"specific"`, `defaultCountry` **must** include `iso2` or `dialCode` or the request is rejected.

### statement
```json
{ "settings": { "statement": { "embedUrl": "", "embedProvider": "youtube", "embedTitle": "" } } }
```
`embedProvider`: `youtube` | `loom` | `vimeo` | `pdf` | `image` | `other`. `embedUrl` must be a valid URL or `""`.

Statement is display-only. Use the existing **`label`** for the heading and **`helperText`** for the description body (there is no separate `description` property). **`required` is always forced to `false`**, whatever you send.

### meeting
```json
{
  "settings": {
    "meeting": {
      "provider": "calcom",
      "link": "https://cal.com/jane/intro",
      "openerText": "Select the slot.",
      "prefillMappings": [
        { "id": "map_1", "sourceKey": "block_a1b2c3", "targetKey": "name" }
      ]
    }
  }
}
```
`provider`: `calendly` | `calcom` | `calid` | `savvycal` | `tidycal`. `link` must be a valid URL or `""`.

`prefillMappings` pass answers from earlier questions into the booking page's query params: `sourceKey` is the earlier question's `questionKey`/`blockKey`, `targetKey` is the provider's param name (usually `name`, `email` or `phone`).

Meeting is display-only for validation (it renders a button that opens the provider in a scheduling dialog), so **`required` is always forced to `false`**. When the provider reports a completed booking, the selected slot is stored as this question's answer.

### choice — `select`, `multiSelect`, `radio`, `checkbox`
```json
{
  "settings": {
    "choice": {
      "allowOther": false,
      "otherLabel": "Other",
      "horizontalAlign": false,
      "optionsPerRow": { "desktop": 3, "mobile": 1 },
      "hideLabels": false,
      "selectionLimit": { "mode": "none" }
    }
  }
}
```
- `optionsPerRow` only applies when `horizontalAlign` is `true`. Allowed values: **1–6**.
- `selectionLimit` is only present on multi-answer types (`multiSelect`, `checkbox`).
  - `{ "mode": "none" }`
  - `{ "mode": "exact", "exact": 3 }` — `exact` required
  - `{ "mode": "range", "min": 1, "max": 4 }` — both required, `min <= max`

### address
```json
{
  "settings": {
    "address": {
      "pages": [
        { "key": "address1", "label": "Address",        "placeholder": "", "required": false, "hidden": false, "order": 1 },
        { "key": "address2", "label": "Address line 2", "placeholder": "", "required": false, "hidden": false, "order": 2 },
        { "key": "city",     "label": "City",           "placeholder": "", "required": false, "hidden": false, "order": 3 },
        { "key": "state",    "label": "State",          "placeholder": "", "required": false, "hidden": false, "order": 4 },
        { "key": "zip",      "label": "Zip",            "placeholder": "", "required": false, "hidden": false, "order": 5 },
        { "key": "country",  "label": "Country",        "placeholder": "", "required": false, "hidden": false, "order": 6 }
      ]
    }
  }
}
```
These six are seeded automatically when the page is created. The admin can rename `label`, change `placeholder`, toggle `required` and `hidden`. `key` is fixed — don't invent new ones.

### rating
```json
{ "settings": { "rating": { "style": "star", "max": 5 } } }
```
`style`: `"star"` or `"number"`. `max` is 2–10.

### opinionScale
```json
{ "settings": { "opinionScale": { "min": 0, "max": 10, "leftLabel": "", "rightLabel": "" } } }
```
`min` must be `<` `max`, both within 0–100. The labels render under the left/right ends of the number row.

### nps
```json
{ "settings": { "nps": { "leftLabel": "", "rightLabel": "", "singleRowOnMobile": false } } }
```
Fixed 0–10 recommendation score. Labels render under the left/right ends. On mobile the buttons use two rows by default; `singleRowOnMobile` shrinks them to fit one row.

### upload — type `file`
```json
{
  "settings": {
    "upload": { "allowMultiple": false, "allowedFileTypes": ["image", "application/pdf"], "maxFileSizeMb": 10 }
  }
}
```
`allowedFileTypes` accepts either a **group name** or a **concrete MIME type**. Empty array = allow everything.

| Group | Expands to |
|---|---|
| `image` | jpeg, png, gif, webp, svg+xml, heic |
| `video` | mp4, quicktime, x-msvideo, webm |
| `audio` | mpeg, wav, ogg, webm, mp4 |
| `text` | plain, csv, html, markdown |
| `application` | pdf, doc, docx, xls, xlsx, ppt, pptx, zip, json |

`maxFileSizeMb` max is **100**. Any value outside the table/limit is rejected.

### matrix
```json
{
  "settings": {
    "matrix": {
      "rows":    [{ "key": "r1", "label": "Speed",   "order": 1 }],
      "columns": [{ "key": "c1", "label": "Good",    "order": 1 }],
      "allowMultiplePerRow": false
    }
  }
}
```
Max 50 rows, 20 columns. `key` and `order` are required on each entry; generate `key` client-side and keep it stable.

### payment

A fixed-price page that charges through **hosted Stripe Checkout**. The owner
connects a Stripe account (per workspace, or per form creator when the form has
no workspace), then every respondent pays the stored price.

```json
{
  "settings": {
    "payment": {
      "stripeAccountId": "acct_123",
      "currency": "usd",
      "amount": 2500,
      "allowInstallments": false,
      "receiptEmailKey": "block_email1"
    }
  }
}
```

| Field | Notes |
|---|---|
| `stripeAccountId` | Connected Stripe account that receives the charge. Empty = page not configured. |
| `currency` | Lowercase ISO code. One of `usd, eur, gbp, cad, aud, chf, nok, sek, dkk, mxn, brl, aed, nzd, pln`. |
| `amount` | **Minor units** (cents). `2500` = $25.00. Max 99,999,999. |
| `allowInstallments` | Offers Klarna/Afterpay where Stripe supports them. |
| `receiptEmailKey` | `questionKey` of an **earlier email question** that receives the receipt. Empty = no receipt. |

Builder endpoints (owner only):

- `GET /forms/:formId/payments/stripe/accounts` → `[{ accountId, name, connectedAt, status, chargesEnabled, payoutsEnabled, detailsSubmitted, requirementsDue }]`
- `POST /forms/:formId/payments/stripe/accounts/refresh` → re-reads capabilities from Stripe and returns the same shape.
- `DELETE /forms/:formId/payments/stripe/accounts/:accountId` → revokes the platform's Stripe access. Historical payments are kept.
- `POST /forms/:formId/payments/stripe/accounts/:accountId/onboarding-link` → `{ url }` — fresh Stripe onboarding link that collects missing requirements. Use when the account status is `incomplete`/`restricted`; it does not make the account payment-ready by itself.
- `POST /forms/:formId/payments/stripe/accounts/:accountId/dashboard-link` → `{ url }` — short-lived link into the owner's own Stripe dashboard.
- `GET /forms/:formId/payments/stripe/connect-url` → `{ url }` — open in the same tab; Stripe redirects back to `/form-builder/:formId?stripe=connected`.

Respondent endpoints:

- `POST /public/forms/:slug/payment-session` `{ pageKey, email?, respondentSessionId? }` → `{ id, url, paymentId }` — redirect to `url`. Retrying with the same `respondentSessionId` reuses the open session instead of charging twice.
- `GET /public/forms/:slug/payment-session/:sessionId?pageKey=…` → verified payment `{ sessionId, status: "paid", amount, currency, pageKey }`.

Store the verified object as the page's answer:

```json
{ "sessionId": "cs_123", "status": "paid", "amount": 2500, "currency": "usd" }
```

On submit the backend re-checks every visible payment page with Stripe (paid,
matching form/page/amount/currency) and rewrites the answer from Stripe — a
client-reported `status: "paid"` is never trusted. Hidden payment pages (via
logic) are skipped.

**Every attempt is recorded.** `POST /public/forms/:slug/payment-session`
writes a `FormPayment` row (amount, currency, connected account, checkout
session, status, customer email). The verified submission is linked to it, so
the owner can reconcile responses with money.

**Payment is its own page.** A page mixing a payment block with other
questions is not supported: the builder hides "Add question" on a payment page
and only offers Payment from "Add page".

**Publishing is gated.** `PATCH /forms/:formId/publish` returns `400` until
every live payment page has a connected account whose Stripe onboarding is complete and
chargeable (`charges_enabled` must be `true`), an amount of at least
`0.50` (minor units `50`), and a single active block. Saving a page whose `stripeAccountId` is not
connected to the form's workspace (or its creator, for workspace-less forms)
also returns `400`, so a form can only ever charge its owner's account.

**Webhooks are authoritative.** `POST /public/stripe/webhook` verifies the
`Stripe-Signature` HMAC over the raw body and is idempotent per Stripe event id.
It updates payment status for:

- `checkout.session.completed` / `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed` / `checkout.session.expired`
- `payment_intent.payment_failed`
- `charge.refunded`, `charge.dispute.created` / `updated` / `closed`
- `account.updated` (refreshes `chargesEnabled`, `payoutsEnabled`, requirements)

The success-page verification is only a fast path; Stripe's webhook is the
source of truth.

**Owner payment history** (signed-in user; own forms + workspace forms):

- `GET /api/v1/payments?status=&currency=&formId=&from=&to=&page=&limit=` → `{ items, total, page, limit }`
- `GET /api/v1/payments/overview` → per-currency `{ paidCount, grossAmount, refundedAmount, pendingCount }`
- `GET /api/v1/payments/:paymentId`
- `POST /api/v1/payments/:paymentId/refund` `{ amountMinor? }` — omitting the amount refunds the remaining balance. Runs in the connected account's context (direct charges).

The **Payments** page in the sidebar shows the totals, the transaction ledger,
and the refund action.

**Share links use the slug** (`/form/:slug`), not the form id.

**Stripe configuration** (backend `.env`):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_CLIENT_ID=ca_...
STRIPE_REDIRECT_URI=http://localhost:5000/api/v1/public/stripe/callback
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_API_BASE_URL=https://api.stripe.com
STRIPE_CONNECT_BASE_URL=https://connect.stripe.com
# Optional platform fee on direct charges, basis points (100 = 1%)
STRIPE_PLATFORM_FEE_BPS=0
```

Without these the payment endpoints return `503`; webhooks without
`STRIPE_WEBHOOK_SECRET` also return `503`.

---

## 4. Character / number limits (existing `validation` object)

`longText` min/max characters and `number` min/max use the **existing** `validation` object, not `settings`:

```json
{ "validation": { "minLength": 10, "maxLength": 500 } }   // longText
{ "validation": { "min": 1, "max": 99 } }                 // number
```

Send **`null`** for "no limit" (the blank input state). `minLength <= maxLength` and `min <= max` are enforced.

---

## 5. Behaviour to code against

1. **Send only the group that matches the type.** Unknown keys in `settings` are rejected (`.strict()`); irrelevant groups are dropped.

2. **Changing a page's `type` wipes its settings.** The server rebuilds them from the new type's defaults. If the user switches `rating` → `file`, the old `{ style, max }` is gone — re-render the panel from the response, don't reuse local state.

3. **Defaults are applied on create.** `POST` a page with no `settings` and the response comes back fully populated (address gets its six rows, upload gets `maxFileSizeMb: 10`, etc.). Use the response to hydrate the settings panel.

4. **Partial updates merge.** `PATCH` with `{ "settings": { "choice": { "hideLabels": true } } }` keeps the other `choice` values intact.

5. **Duplicating a page copies settings and cover image.**

---

## 6. Not yet implemented on the backend

These are **stored as flags only** — no server-side behaviour exists yet. Don't tell users they're active:

- `email.emailVerification` and `phone.phoneVerification` — no OTP is sent or checked.
- `email.businessEmailsOnly` — not enforced on submit.
- **All submission-time validation.** `POST /public/forms/:slug/submit` currently accepts any answers payload without checking `required`, selection limits, upload size/type, or scale bounds. Client-side validation is the only enforcement today.
