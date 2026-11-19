/// <reference types="jest" />
import crypto from "crypto";
import request from "supertest";
import app from "../app";
import {
  createAccountOnboardingLink,
  createCheckoutSession,
  createDashboardLink,
  createRefund,
  retrieveCheckoutSession,
} from "../modules/payments/stripe.client";
import { assertPaymentPagesReady } from "../modules/payments/payment-account";
import { User } from "../models/User";
import { env } from "../config/env";

jest.mock("../modules/payments/stripe.client");

const api = request(app);
const mockCreateCheckout = createCheckoutSession as jest.Mock;
const mockRetrieveCheckout = retrieveCheckoutSession as jest.Mock;
const mockCreateRefund = createRefund as jest.Mock;
const mockOnboardingLink = createAccountOnboardingLink as jest.Mock;
const mockDashboardLink = createDashboardLink as jest.Mock;

describe("Stripe payment pages", () => {
  let authToken: string;
  let formId: string;
  let pageKey: string;
  let slug: string;

  beforeEach(async () => {
    jest.clearAllMocks();

    const userEmail = `payer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@example.com`;
    const regRes = await api.post("/api/v1/auth/register").send({
      name: "Payer",
      email: userEmail,
      password: "password123",
    });
    authToken = regRes.body.data.tokens.accessToken;

    // Payments can only point at an account the owner has connected.
    const me = await api
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${authToken}`);
    await User.updateOne(
      { _id: me.body.data.id },
      {
        stripeAccounts: [
          {
            accountId: "acct_test_1234",
            name: "Test Stripe",
            connectedAt: new Date(),
            chargesEnabled: true,
            detailsSubmitted: true,
          },
        ],
      }
    );

    const formRes = await api
      .post("/api/v1/forms")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ title: "Paid form" });
    formId = formRes.body.data.id;

    const pageRes = await api
      .post(`/api/v1/forms/${formId}/pages`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "payment",
        title: "Pay for your order",
        settings: {
          payment: {
            stripeAccountId: "acct_test_1234",
            currency: "usd",
            amount: 1000,
          },
        },
      });
    pageKey = pageRes.body.data.pageKey;

    const publishRes = await api
      .patch(`/api/v1/forms/${formId}/publish`)
      .set("Authorization", `Bearer ${authToken}`);
    slug = publishRes.body.data.slug;
  });

  it("lists accounts stored on the creator for a workspace-less form", async () => {
    const me = await api
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${authToken}`);
    await User.updateOne(
      { _id: me.body.data.id },
      {
        stripeAccounts: [
          {
            accountId: "acct_personal_1",
            name: "Personal Stripe",
            connectedAt: new Date(),
          },
        ],
      }
    );

    const res = await api
      .get(`/api/v1/forms/${formId}/payments/stripe/accounts`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({
        accountId: "acct_personal_1",
        name: "Personal Stripe",
      }),
    ]);
  });

  it("issues account onboarding and dashboard links only for a connected account", async () => {
    mockOnboardingLink.mockResolvedValue({
      url: "https://connect.stripe.com/setup/s/test",
    });
    const onboarding = await api
      .post(
        `/api/v1/forms/${formId}/payments/stripe/accounts/acct_test_1234/onboarding-link`
      )
      .set("Authorization", `Bearer ${authToken}`);
    expect(onboarding.status).toBe(200);
    expect(onboarding.body.data.url).toContain("connect.stripe.com");
    expect(mockOnboardingLink).toHaveBeenCalledWith(
      "acct_test_1234",
      expect.objectContaining({
        refreshUrl: expect.stringContaining("stripe=refresh"),
        returnUrl: expect.stringContaining("stripe=connected"),
      })
    );

    mockDashboardLink.mockResolvedValue({
      url: "https://dashboard.stripe.com/test",
    });
    const dashboard = await api
      .post(
        `/api/v1/forms/${formId}/payments/stripe/accounts/acct_test_1234/dashboard-link`
      )
      .set("Authorization", `Bearer ${authToken}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.url).toContain("dashboard.stripe.com");

    const foreign = await api
      .post(
        `/api/v1/forms/${formId}/payments/stripe/accounts/acct_someone_else/onboarding-link`
      )
      .set("Authorization", `Bearer ${authToken}`);
    expect(foreign.status).toBe(404);
  });

  it("creates a checkout session from the stored settings", async () => {    mockCreateCheckout.mockResolvedValue({
      id: "cs_test_1",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
    });

    const res = await api
      .post(`/api/v1/public/forms/${slug}/payment-session`)
      .send({ pageKey, email: "buyer@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      id: "cs_test_1",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
      paymentId: expect.any(String),
    });
    expect(mockCreateCheckout).toHaveBeenCalledWith(
      "acct_test_1234",
      expect.objectContaining({
        amount: 1000,
        currency: "usd",
        email: "buyer@example.com",
        allowInstallments: false,
      })
    );
  });

  it("rejects a submission whose payment is not paid", async () => {
    mockRetrieveCheckout.mockResolvedValue({
      id: "cs_test_1",
      payment_status: "unpaid",
      amount_total: 1000,
      currency: "usd",
      metadata: { formId, pageKey },
    });

    const res = await api
      .post(`/api/v1/public/forms/${slug}/submit`)
      .send({
        answers: [{ pageKey, type: "payment", value: { sessionId: "cs_test_1" } }],
      });

    expect(res.status).toBe(402);

    const responses = await api
      .get(`/api/v1/forms/${formId}/responses`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(responses.body.data).toHaveLength(0);
  });

  it("rejects a submission for the wrong amount", async () => {
    mockRetrieveCheckout.mockResolvedValue({
      id: "cs_test_1",
      payment_status: "paid",
      amount_total: 500,
      currency: "usd",
      metadata: { formId, pageKey },
    });

    const res = await api
      .post(`/api/v1/public/forms/${slug}/submit`)
      .send({
        answers: [{ pageKey, type: "payment", value: { sessionId: "cs_test_1" } }],
      });

    expect(res.status).toBe(400);
  });

  it("rejects a submission that omits the payment answer", async () => {
    const res = await api.post(`/api/v1/public/forms/${slug}/submit`).send({
      answers: [],
    });

    expect(res.status).toBe(400);
  });

  it("stores the Stripe-verified payment on a paid submission", async () => {
    mockRetrieveCheckout.mockResolvedValue({
      id: "cs_test_1",
      payment_status: "paid",
      amount_total: 1000,
      currency: "usd",
      metadata: { formId, pageKey },
    });

    const res = await api
      .post(`/api/v1/public/forms/${slug}/submit`)
      .send({
        answers: [
          {
            pageKey,
            type: "payment",
            // A forged status/amount must be overwritten by the verified data.
            value: { sessionId: "cs_test_1", status: "paid", amount: 1 },
          },
        ],
      });

    expect(res.status).toBe(200);

    const responses = await api
      .get(`/api/v1/forms/${formId}/responses`)
      .set("Authorization", `Bearer ${authToken}`);
    const answer = responses.body.data[0].answers.find(
      (a: any) => a.type === "payment"
    );
    expect(answer.value).toEqual({
      sessionId: "cs_test_1",
      status: "paid",
      amount: 1000,
      currency: "usd",
    });
  });

  it("refuses to save a Stripe account the owner did not connect", async () => {
    const res = await api
      .post(`/api/v1/forms/${formId}/pages`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "payment",
        title: "Somebody else's account",
        settings: {
          payment: {
            stripeAccountId: "acct_someone_else",
            currency: "usd",
            amount: 1000,
          },
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not connected/i);
  });

  it("refuses to publish a payment page with no connected account", async () => {
    const formRes = await api
      .post("/api/v1/forms")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ title: "Unconfigured payment" });
    const newFormId = formRes.body.data.id;

    await api
      .post(`/api/v1/forms/${newFormId}/pages`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "payment",
        title: "Order total",
        settings: { payment: { currency: "usd", amount: 2500 } },
      });

    const publishRes = await api
      .patch(`/api/v1/forms/${newFormId}/publish`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(publishRes.status).toBe(400);
    expect(publishRes.body.message).toMatch(/Connect a Stripe account/i);
  });

  it("refuses to publish until the connected account can actually charge", () => {
    expect(() =>
      assertPaymentPagesReady(
        [
          {
            pageKey: "page_1",
            type: "payment",
            title: "Order total",
            blocks: [{ isActive: true }],
            settings: {
              payment: { stripeAccountId: "acct_test_1234", amount: 1000 },
            },
          },
        ],
        [{ accountId: "acct_test_1234", chargesEnabled: false }]
      )
    ).toThrow(/cannot accept payments/i);

    expect(() =>
      assertPaymentPagesReady(
        [
          {
            pageKey: "page_1",
            type: "payment",
            title: "Order total",
            blocks: [{ isActive: true }],
            settings: {
              payment: { stripeAccountId: "acct_test_1234", amount: 1000 },
            },
          },
        ],
        [{ accountId: "acct_test_1234" }]
      )
    ).toThrow(/cannot accept payments/i);
  });

  it("refuses to publish a payment page that also has questions", () => {
    expect(() =>
      assertPaymentPagesReady(
        [
          {
            pageKey: "page_1",
            type: "payment",
            title: "Order total",
            blocks: [{ isActive: true }, { isActive: true }],
            settings: {
              payment: { stripeAccountId: "acct_test_1234", amount: 1000 },
            },
          },
        ],
        [{ accountId: "acct_test_1234" }]
      )
    ).toThrow(/separate pages/i);
  });

  it("lists the linked transaction and refunds it through the owner's account", async () => {
    mockCreateCheckout.mockResolvedValue({
      id: "cs_refund_1",
      url: "https://checkout.stripe.com/c/pay/cs_refund_1",
    });
    await api
      .post(`/api/v1/public/forms/${slug}/payment-session`)
      .send({ pageKey, email: "buyer@example.com" })
      .expect(201);

    mockRetrieveCheckout.mockResolvedValue({
      id: "cs_refund_1",
      payment_status: "paid",
      amount_total: 1000,
      currency: "usd",
      payment_intent: "pi_refund_1",
      metadata: { formId, pageKey },
    });
    await api
      .post(`/api/v1/public/forms/${slug}/submit`)
      .send({
        answers: [
          { pageKey, type: "payment", value: { sessionId: "cs_refund_1" } },
        ],
      })
      .expect(200);

    const listRes = await api
      .get("/api/v1/payments")
      .set("Authorization", `Bearer ${authToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.total).toBe(1);
    const payment = listRes.body.data.items[0];
    expect(payment).toEqual(
      expect.objectContaining({
        formId,
        status: "paid",
        amountMinor: 1000,
        currency: "usd",
        paymentIntentId: "pi_refund_1",
        customerEmail: "buyer@example.com",
      })
    );
    expect(payment.submissionId).toBeTruthy();

    const overviewRes = await api
      .get("/api/v1/payments/overview")
      .set("Authorization", `Bearer ${authToken}`);
    expect(overviewRes.body.data.currencies).toEqual([
      expect.objectContaining({
        currency: "usd",
        paidCount: 1,
        grossAmount: 1000,
      }),
    ]);

    mockCreateRefund.mockResolvedValue({
      id: "re_1",
      amount: 1000,
      currency: "usd",
      status: "succeeded",
      payment_intent: "pi_refund_1",
    });
    const refundRes = await api
      .post(`/api/v1/payments/${payment.id}/refund`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({});
    expect(refundRes.status).toBe(200);
    expect(refundRes.body.data).toEqual(
      expect.objectContaining({
        status: "refunded",
        refundAmountMinor: 1000,
        refundableMinor: 0,
      })
    );
    // Direct charges: the refund must be issued inside the connected account.
    expect(mockCreateRefund).toHaveBeenCalledWith("acct_test_1234", {
      paymentIntentId: "pi_refund_1",
      amountMinor: 1000,
    });
  });

  it("keeps one owner's payments out of another owner's ledger", async () => {
    mockCreateCheckout.mockResolvedValue({
      id: "cs_private_1",
      url: "https://checkout.stripe.com/c/pay/cs_private_1",
    });
    await api
      .post(`/api/v1/public/forms/${slug}/payment-session`)
      .send({ pageKey })
      .expect(201);

    const mine = await api
      .get("/api/v1/payments")
      .set("Authorization", `Bearer ${authToken}`);
    const paymentId = mine.body.data.items[0].id;

    const otherEmail = `other_${Date.now()}@example.com`;
    const otherReg = await api.post("/api/v1/auth/register").send({
      name: "Other",
      email: otherEmail,
      password: "password123",
    });
    const otherToken = otherReg.body.data.tokens.accessToken;

    const theirs = await api
      .get("/api/v1/payments")
      .set("Authorization", `Bearer ${otherToken}`);
    expect(theirs.status).toBe(200);
    expect(theirs.body.data.total).toBe(0);

    const detail = await api
      .get(`/api/v1/payments/${paymentId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(detail.status).toBe(404);
  });

  it("only accepts a webhook signed with the configured secret", async () => {
    mockCreateCheckout.mockResolvedValue({
      id: "cs_webhook_1",
      url: "https://checkout.stripe.com/c/pay/cs_webhook_1",
    });
    await api
      .post(`/api/v1/public/forms/${slug}/payment-session`)
      .send({ pageKey })
      .expect(201);

    const payload = JSON.stringify({
      id: "evt_payment_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_webhook_1",
          payment_status: "paid",
          amount_total: 1000,
          currency: "usd",
          payment_intent: "pi_webhook_1",
        },
      },
    });
    const badRes = await api
      .post("/api/v1/public/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("Stripe-Signature", "t=1,v1=deadbeef")
      .send(payload);
    expect([401, 503]).toContain(badRes.status);

    const previousSecret = env.stripeWebhookSecret;
    env.stripeWebhookSecret = "whsec_test_secret";
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = crypto
        .createHmac("sha256", env.stripeWebhookSecret)
        .update(`${timestamp}.${payload}`)
        .digest("hex");

      const res = await api
        .post("/api/v1/public/stripe/webhook")
        .set("Content-Type", "application/json")
        .set("Stripe-Signature", `t=${timestamp},v1=${signature}`)
        .send(payload);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ received: true, duplicate: false });
    } finally {
      env.stripeWebhookSecret = previousSecret;
    }

    const listRes = await api
      .get("/api/v1/payments")
      .set("Authorization", `Bearer ${authToken}`);
    expect(listRes.body.data.items[0]).toEqual(
      expect.objectContaining({
        status: "paid",
        paymentIntentId: "pi_webhook_1",
        amountMinor: 1000,
      })
    );
  });
});
