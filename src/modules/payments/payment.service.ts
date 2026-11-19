import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { env } from "../../config/env";
import { Workspace } from "../../models/Workspace";
import { User } from "../../models/User";
import { assertCanEditForm } from "../forms/form.service";
import { findPublicFormWithVersion } from "../public-form/public-form.lookup";
import {
  readScopedAccounts,
  resolveAccountScope,
  type PaymentPage,
} from "./payment-account";
import {
  buildConnectUrl,
  createCheckoutSession,
  exchangeConnectCode,
  retrieveCheckoutSession,
} from "./stripe.client";

const findPaymentPage = (version: any, pageKey: string): PaymentPage => {
  const pages: PaymentPage[] = (version?.formSchema?.pages || []).filter(
    (p: PaymentPage) => p?.isActive !== false
  );
  const page =
    pages.find((p) => p.pageKey === pageKey) ||
    pages.find((p) => p.type === "payment" && p.pageKey === pageKey);
  if (!page || page.type !== "payment") {
    throw new ApiError(httpStatus.NOT_FOUND, "Payment page not found");
  }
  return page;
};

const readPaymentSettings = (page: PaymentPage) => {
  const settings = page.settings?.payment;
  if (!settings?.stripeAccountId || !settings.amount) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This payment page is not connected to a Stripe account yet."
    );
  }
  return {
    accountId: settings.stripeAccountId,
    currency: settings.currency || "usd",
    amount: settings.amount,
    allowInstallments: Boolean(settings.allowInstallments),
    receiptEmailKey: settings.receiptEmailKey || "",
  };
};

/** Accounts connected by the form's workspace (drives the settings select). */
export const listStripeAccounts = async (userId: string, formId: string) => {
  const form = await assertCanEditForm(userId, formId);
  const accounts = await readScopedAccounts(resolveAccountScope(form));
  return accounts.map((account) => ({
    accountId: account.accountId,
    name: account.name || `Stripe account ••••${account.accountId.slice(-4)}`,
    connectedAt: account.connectedAt,
  }));
};

/** OAuth URL that sends the owner to Stripe to connect an account. */
export const getConnectUrl = async (userId: string, formId: string) => {
  const form = await assertCanEditForm(userId, formId);
  const state = jwt.sign(
    {
      formId: String(form._id),
      workspaceId: form.workspaceId ? String(form.workspaceId) : "",
      userId,
    },
    env.jwtSecret,
    { expiresIn: "15m" }
  );
  return buildConnectUrl(state);
};

/** OAuth callback: store the connected account and send the owner back. */
export const completeConnect = async (code: string, state: string) => {
  let payload: { formId: string; workspaceId: string; userId: string };
  try {
    payload = jwt.verify(state, env.jwtSecret) as typeof payload;
  } catch {
    throw new ApiError(httpStatus.BAD_REQUEST, "This Stripe connection link expired.");
  }

  const accountId = await exchangeConnectCode(code);
  const accountName = `Stripe account ••••${accountId.slice(-4)}`;

  if (payload.workspaceId) {
    const workspace = await Workspace.findById(payload.workspaceId);
    if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");

    if (!workspace.stripeAccounts.some((account) => account.accountId === accountId)) {
      workspace.stripeAccounts.push({
        accountId,
        name: accountName,
        connectedAt: new Date(),
        connectedBy: new mongoose.Types.ObjectId(payload.userId),
      });
      await workspace.save();
    }
  } else {
    // Workspace-less form: the creator owns the connected account.
    const user = await User.findById(payload.userId);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    if (!user.stripeAccounts.some((account) => account.accountId === accountId)) {
      user.stripeAccounts.push({
        accountId,
        name: accountName,
        connectedAt: new Date(),
      });
      await user.save();
    }
  }

  return `${env.frontendUrl}/form-builder/${payload.formId}?stripe=connected`;
};

/** Create a hosted Checkout Session for a published payment page. */
export const createPublicPaymentSession = async (
  slug: string,
  data: { pageKey: string; email?: string; respondentSessionId?: string }
) => {
  const { form, version } = await findPublicFormWithVersion(slug);
  const page = findPaymentPage(version, data.pageKey);
  const settings = readPaymentSettings(page);

  const returnUrl = `${env.frontendUrl}/form/${form.slug}`;
  // Stripe replaces {CHECKOUT_SESSION_ID} itself; keep it unencoded.
  const successUrl = `${returnUrl}?payment=success&payment_page=${encodeURIComponent(
    page.pageKey
  )}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${returnUrl}?payment=cancelled&payment_page=${encodeURIComponent(
    page.pageKey
  )}`;

  const session = await createCheckoutSession(settings.accountId, {
    currency: settings.currency,
    amount: settings.amount,
    title: page.title || page.label || "Payment",
    allowInstallments: settings.allowInstallments,
    email: data.email,
    metadata: {
      formId: String(form._id),
      pageKey: page.pageKey,
      sessionId: data.respondentSessionId || "",
    },
    successUrl,
    cancelUrl,
  });

  return { id: session.id, url: session.url };
};

/**
 * Trust a checkout session only after Stripe confirms it: paid, for this form
 * and page, with the amount/currency stored in the published settings.
 */
export const verifyPaidSession = async (
  formId: string,
  page: PaymentPage,
  sessionId: string
) => {
  const settings = readPaymentSettings(page);
  const session = await retrieveCheckoutSession(settings.accountId, sessionId);

  if (
    session.metadata?.formId !== formId ||
    session.metadata?.pageKey !== page.pageKey
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Payment does not belong to this form.");
  }
  if (session.payment_status !== "paid") {
    throw new ApiError(httpStatus.PAYMENT_REQUIRED, "Payment has not been completed.");
  }
  if (
    session.amount_total !== settings.amount ||
    session.currency !== settings.currency
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Payment amount does not match this page.");
  }

  return {
    sessionId: session.id,
    status: "paid" as const,
    amount: session.amount_total,
    currency: session.currency,
  };
};

/** Public verification used when the respondent returns from Stripe Checkout. */
export const verifyPublicPaymentSession = async (
  slug: string,
  sessionId: string,
  pageKey: string
) => {
  const { form, version } = await findPublicFormWithVersion(slug);
  const page = findPaymentPage(version, pageKey);
  const payment = await verifyPaidSession(String(form._id), page, sessionId);
  return { ...payment, pageKey: page.pageKey };
};

/**
 * Called on submit: every visible payment page must carry a paid session, and
 * the stored value is rebuilt from Stripe rather than trusted from the client.
 */
export const verifySubmissionPayments = async (args: {
  formId: string;
  version: any;
  answers: any[];
  hiddenPageKeys?: Set<string>;
}) => {
  const pages: PaymentPage[] = (args.version?.formSchema?.pages || []).filter(
    (p: PaymentPage) => p?.type === "payment" && p?.isActive !== false
  );
  if (pages.length === 0) return;

  for (const page of pages) {
    if (args.hiddenPageKeys?.has(page.pageKey)) continue;

    const answer = args.answers.find(
      (a) => a.pageKey === page.pageKey || a.blockKey === page.pageKey
    );
    const sessionId =
      answer && typeof answer.value === "object" && answer.value !== null
        ? String((answer.value as { sessionId?: unknown }).sessionId || "")
        : "";

    if (!sessionId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Complete the payment before submitting the form."
      );
    }

    const payment = await verifyPaidSession(args.formId, page, sessionId);
    if (answer) {
      answer.value = payment;
      answer.type = "payment";
    }
  }
};
