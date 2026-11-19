/// <reference types="jest" />
import request from "supertest";
import app from "../app";
import {
  createCheckoutSession,
  retrieveCheckoutSession,
} from "../modules/payments/stripe.client";
import { assertPaymentPagesReady } from "../modules/payments/payment-account";
import { User } from "../models/User";

jest.mock("../modules/payments/stripe.client");

const api = request(app);
const mockCreateCheckout = createCheckoutSession as jest.Mock;
const mockRetrieveCheckout = retrieveCheckoutSession as jest.Mock;

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
});
