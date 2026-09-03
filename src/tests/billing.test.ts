/// <reference types="jest" />
import crypto from "crypto";
import mongoose from "mongoose";

/**
 * Lemon Squeezy billing tests.
 *
 * The LS_* environment variables MUST be set before the app module is
 * required, because config/env.ts snapshots process.env at import time.
 */
process.env.LEMONSQUEEZY_API_KEY = "";
process.env.LEMONSQUEEZY_STORE_ID = "";
process.env.LEMONSQUEEZY_WEBHOOK_SECRET = "test-webhook-secret";
process.env.LS_VARIANT_PRO_MONTHLY = "101";
process.env.LS_VARIANT_PRO_YEARLY = "102";
process.env.LS_VARIANT_TEAM_MONTHLY = "103";
process.env.LS_VARIANT_TEAM_YEARLY = "104";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require("../app").default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("supertest");

const api = request(app);
const WEBHOOK_PATH = "/api/v1/billing/webhook";
const WEBHOOK_SECRET = "test-webhook-secret";
const LS_SUBSCRIPTION_ID = "sub_test_1";

const signedWebhook = (payload: unknown, secret: string = WEBHOOK_SECRET) =>
  api
    .post(WEBHOOK_PATH)
    .set("Content-Type", "application/json")
    .set(
      "X-Signature",
      crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex")
    )
    .send(JSON.stringify(payload));

const registerUser = async () => {
  const regRes = await api.post("/api/v1/auth/register").send({
    name: "Billing Tester",
    email: `billing${Date.now()}${Math.floor(Math.random() * 10000)}@example.com`,
    password: "password123",
  });
  expect(regRes.status).toBe(201);

  const token = regRes.body.data.tokens.accessToken as string;
  const meRes = await api
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${token}`);
  return { token, userId: meRes.body.data.id as string };
};

const subscriptionAttributes = (overrides: Record<string, unknown> = {}) => ({
  store_id: 1,
  customer_id: 555001,
  order_id: 900001,
  order_item_id: 1001,
  product_id: 7001,
  variant_id: 101,
  product_name: "Form Builder Pro",
  variant_name: "Pro Monthly",
  user_name: "Billing Tester",
  user_email: "tester@example.com",
  status: "active",
  cancelled: false,
  trial_ends_at: null,
  billing_anchor: 3,
  first_subscription_item: {
    id: 1,
    price_id: 1,
    quantity: 1,
    created_at: "2026-09-03T00:00:00Z",
    updated_at: "2026-09-03T00:00:00Z",
  },
  renews_at: "2026-10-03T00:00:00.000Z",
  ends_at: null,
  created_at: "2026-09-03T00:00:00.000000Z",
  updated_at: "2026-09-03T00:00:00.000000Z",
  urls: {
    update_payment_method: "https://store.lemonsqueezy.com/billing/update",
    customer_portal: "https://store.lemonsqueezy.com/billing",
  },
  test_mode: true,
  ...overrides,
});

const subscriptionPayload = (
  eventName: string,
  attributes: Record<string, unknown>,
  userId?: string
) => ({
  meta: {
    event_name: eventName,
    webhook_id: "wh_test_1",
    test_mode: true,
    ...(userId ? { custom_data: { user_id: userId } } : {}),
  },
  data: {
    type: "subscriptions",
    id: LS_SUBSCRIPTION_ID,
    attributes,
  },
});


describe("Lemon Squeezy billing", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(
        process.env.MONGODB_URI || "mongodb://localhost:27017/typeform_test"
      );
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe("GET /api/v1/billing/plans", () => {
    it("returns the public pricing tiers", async () => {
      const res = await api.get("/api/v1/billing/plans");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plans).toHaveLength(3);

      const byId = Object.fromEntries(
        res.body.data.plans.map((p: any) => [p.id, p])
      );
      expect(byId.free.prices.monthly).toBe(0);
      expect(byId.pro.prices.monthly).toBe(19);
      expect(byId.pro.prices.yearly).toBe(190);
      expect(byId.team.prices.monthly).toBe(49);
      expect(byId.team.prices.yearly).toBe(490);
      expect(byId.pro.limits.forms).toBe(-1);
      expect(byId.free.limits.forms).toBe(3);
    });
  });

  describe("GET /api/v1/billing/subscription", () => {
    it("rejects unauthenticated requests", async () => {
      const res = await api.get("/api/v1/billing/subscription");
      expect(res.status).toBe(401);
    });

    it("returns the implicit free plan for a new account", async () => {
      const { token } = await registerUser();

      const res = await api
        .get("/api/v1/billing/subscription")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.plan).toBe("free");
      expect(res.body.data.status).toBe("free");
    });
  });

  describe("POST /api/v1/billing/checkout", () => {
    it("validates the request body", async () => {
      const { token } = await registerUser();

      const res = await api
        .post("/api/v1/billing/checkout")
        .set("Authorization", `Bearer ${token}`)
        .send({ plan: "enterprise", interval: "weekly" });

      expect(res.status).toBe(422);
    });

    it("returns 503 while Lemon Squeezy is not configured", async () => {
      const { token } = await registerUser();

      const res = await api
        .post("/api/v1/billing/checkout")
        .set("Authorization", `Bearer ${token}`)
        .send({ plan: "pro", interval: "monthly" });

      expect(res.status).toBe(503);
    });
  });

  describe("POST /api/v1/billing/webhook", () => {
    it("rejects requests without a signature", async () => {
      const res = await api
        .post(WEBHOOK_PATH)
        .set("Content-Type", "application/json")
        .send({ meta: { event_name: "subscription_created" }, data: {} });

      expect(res.status).toBe(401);
    });

    it("rejects an invalid signature", async () => {
      const payload = subscriptionPayload(
        "subscription_created",
        subscriptionAttributes()
      );

      const res = await api
        .post(WEBHOOK_PATH)
        .set("Content-Type", "application/json")
        .set("X-Signature", "not-a-valid-signature")
        .send(JSON.stringify(payload));

      expect(res.status).toBe(401);
    });

    it("rejects a signature computed with the wrong secret", async () => {
      const payload = subscriptionPayload(
        "subscription_created",
        subscriptionAttributes()
      );

      const res = await signedWebhook(payload, "wrong-secret");

      expect(res.status).toBe(401);
    });

    it("activates a Pro monthly subscription from subscription_created", async () => {
      const { userId, token } = await registerUser();

      const payload = subscriptionPayload(
        "subscription_created",
        subscriptionAttributes({ variant_id: 101 }),
        userId
      );
      const res = await signedWebhook(payload);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const sub = await api
        .get("/api/v1/billing/subscription")
        .set("Authorization", `Bearer ${token}`);
      expect(sub.body.data.plan).toBe("pro");
      expect(sub.body.data.interval).toBe("monthly");
      expect(sub.body.data.status).toBe("active");
      expect(sub.body.data.renewsAt).toBe("2026-10-03T00:00:00.000Z");
    });

    it("is idempotent when the same event is replayed", async () => {
      const { userId, token } = await registerUser();

      const payload = subscriptionPayload(
        "subscription_created",
        subscriptionAttributes({ variant_id: 101 }),
        userId
      );
      await signedWebhook(payload);
      await signedWebhook(payload); // replay

      const sub = await api
        .get("/api/v1/billing/subscription")
        .set("Authorization", `Bearer ${token}`);

      expect(sub.body.data.plan).toBe("pro");
      expect(sub.body.data.status).toBe("active");
    });

    it("downgrades to free when the subscription expires", async () => {
      const { userId, token } = await registerUser();

      await signedWebhook(
        subscriptionPayload(
          "subscription_created",
          subscriptionAttributes({ variant_id: 101 }),
          userId
        )
      );
      await signedWebhook(
        subscriptionPayload(
          "subscription_updated",
          subscriptionAttributes({
            variant_id: 101,
            status: "expired",
            ends_at: "2026-09-01T00:00:00.000Z",
            renews_at: null,
          }),
          userId
        )
      );

      const sub = await api
        .get("/api/v1/billing/subscription")
        .set("Authorization", `Bearer ${token}`);

      expect(sub.body.data.plan).toBe("free");
      expect(sub.body.data.status).toBe("expired");
    });

    it("marks the subscription past_due on a failed payment", async () => {
      const { userId, token } = await registerUser();

      await signedWebhook(
        subscriptionPayload(
          "subscription_created",
          subscriptionAttributes({ variant_id: 103, variant_name: "Team Monthly" }),
          userId
        )
      );
      await signedWebhook({
        meta: {
          event_name: "subscription_payment_failed",
          test_mode: true,
          custom_data: { user_id: userId },
        },
        data: {
          type: "subscription-invoices",
          id: "inv_1",
          attributes: {
            subscription_id: LS_SUBSCRIPTION_ID,
            status: "failed",
            billed_at: "2026-09-03T00:00:00.000Z",
          },
        },
      });

      const sub = await api
        .get("/api/v1/billing/subscription")
        .set("Authorization", `Bearer ${token}`);

      expect(sub.body.data.plan).toBe("team");
      expect(sub.body.data.status).toBe("past_due");
    });

    it("records a successful payment and keeps access", async () => {
      const { userId, token } = await registerUser();

      await signedWebhook(
        subscriptionPayload(
          "subscription_created",
          subscriptionAttributes({ variant_id: 102, variant_name: "Pro Yearly" }),
          userId
        )
      );
      await signedWebhook({
        meta: {
          event_name: "subscription_payment_success",
          test_mode: true,
          custom_data: { user_id: userId },
        },
        data: {
          type: "subscription-invoices",
          id: "inv_2",
          attributes: {
            subscription_id: LS_SUBSCRIPTION_ID,
            status: "paid",
            billed_at: "2026-09-03T01:00:00.000Z",
          },
        },
      });

      const sub = await api
        .get("/api/v1/billing/subscription")
        .set("Authorization", `Bearer ${token}`);

      expect(sub.body.data.plan).toBe("pro");
      expect(sub.body.data.status).toBe("active");
      expect(sub.body.data.lastPaymentAt).toBe("2026-09-03T01:00:00.000Z");
    });

    it("acknowledges unknown events without action", async () => {
      const res = await signedWebhook({
        meta: { event_name: "license_key_created", test_mode: true },
        data: { type: "license-keys", id: "key_1", attributes: {} },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("plan gating", () => {
    it("limits free accounts to 3 forms", async () => {
      const { token } = await registerUser();
      const headers = { Authorization: `Bearer ${token}` };

      for (let i = 1; i <= 3; i++) {
        const res = await api
          .post("/api/v1/forms")
          .set(headers)
          .send({ title: `Form ${i}` });
        expect(res.status).toBe(201);
      }

      const fourth = await api
        .post("/api/v1/forms")
        .set(headers)
        .send({ title: "Form 4" });

      expect(fourth.status).toBe(403);
      expect(fourth.body.success).toBe(false);
      expect(fourth.body.message).toMatch(/Free plan/i);
    });
  });
});

