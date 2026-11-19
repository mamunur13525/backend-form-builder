import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { env } from "../../config/env";
import { Workspace } from "../../models/Workspace";
import { User } from "../../models/User";
import { FormPayment } from "../../models/FormPayment";
import { assertCanEditForm } from "../forms/form.service";
import { findPublicFormWithVersion } from "../public-form/public-form.lookup";
import {
  readScopedAccounts,
  resolveAccountScope,
  type ConnectedStripeAccount,
  type PaymentPage,
} from "./payment-account";
import {
  buildConnectUrl,
  createAccountOnboardingLink,
  createCheckoutSession,
  createDashboardLink,
  createRefund,
  deauthorizeAccount,
  exchangeConnectCode,
  retrieveAccount,
  retrieveCheckoutSession,
  type StripeAccountResult,
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

/**
 * Payout destination changes are owner/admin work; ordinary editors can still
 * build forms but must not redirect someone else's money.
 */
const assertCanManagePayments = async (userId: string, formId: string) => {
  const form = await assertCanEditForm(userId, formId);
  if (!form.workspaceId) return form;

  const workspace = await Workspace.findById(form.workspaceId).lean();
  if (!workspace) return form;

  const isOwner =
    String(workspace.createdBy?._id || workspace.createdBy) === userId.toString();
  const member = (workspace.members || []).find(
    (m: any) => String(m.userId?._id || m.userId) === userId.toString()
  );
  if (isOwner || member?.role === "admin") return form;

  throw new ApiError(
    httpStatus.FORBIDDEN,
    "Only the form owner or a workspace admin can manage Stripe payments"
  );
};

const snapshotFields = (account: StripeAccountResult) => ({
  country: account.country || "",
  email: account.email || "",
  chargesEnabled: Boolean(account.charges_enabled),
  payoutsEnabled: Boolean(account.payouts_enabled),
  detailsSubmitted: Boolean(account.details_submitted),
  requirementsDue: account.requirements?.currently_due || [],
  statusSyncedAt: new Date(),
});

/** Persist a live Stripe account snapshot wherever the account is connected. */
export const syncStripeAccountSnapshot = async (
  accountId: string,
  account: StripeAccountResult
): Promise<void> => {
  if (!accountId) return;
  const fields = snapshotFields(account);
  const $set: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    $set[`stripeAccounts.$.${key}`] = value;
  }
  await Promise.all([
    Workspace.updateMany({ "stripeAccounts.accountId": accountId }, { $set }),
    User.updateMany({ "stripeAccounts.accountId": accountId }, { $set }),
  ]);
};

/** Stripe is the source of truth for account readiness; never assume ready. */
const refreshAccount = async (
  account: ConnectedStripeAccount
): Promise<ConnectedStripeAccount> => {
  try {
    const live = await retrieveAccount(account.accountId);
    await syncStripeAccountSnapshot(account.accountId, live);
    return { ...account, ...snapshotFields(live) };
  } catch (error) {
    console.error(
      `Could not refresh Stripe account ${account.accountId}:`,
      error instanceof Error ? error.message : error
    );
    return account;
  }
};

const accountStatus = (account: ConnectedStripeAccount) => {
  if (account.detailsSubmitted === false) return "incomplete" as const;
  if (account.chargesEnabled === false) return "restricted" as const;
  return account.chargesEnabled === true ? ("active" as const) : ("unknown" as const);
};

const accountView = (account: ConnectedStripeAccount) => ({
  accountId: account.accountId,
  name: account.name || `Stripe account ••••${account.accountId.slice(-4)}`,
  connectedAt: account.connectedAt,
  country: account.country || "",
  email: account.email || "",
  chargesEnabled: account.chargesEnabled,
  payoutsEnabled: account.payoutsEnabled,
  detailsSubmitted: account.detailsSubmitted,
  requirementsDue: account.requirementsDue || [],
  statusSyncedAt: account.statusSyncedAt,
  status: accountStatus(account),
  canAcceptPayments: account.chargesEnabled === true,
});

/** Accounts connected by the form's workspace (drives the settings select). */
export const listStripeAccounts = async (userId: string, formId: string) => {
  const form = await assertCanEditForm(userId, formId);
  const accounts = await readScopedAccounts(resolveAccountScope(form));
  return accounts.map(accountView);
};

/** Re-reads every scoped account from Stripe, then returns the fresh list. */
export const refreshStripeAccounts = async (userId: string, formId: string) => {
  const form = await assertCanManagePayments(userId, formId);
  const accounts = await readScopedAccounts(resolveAccountScope(form));
  const refreshed = await Promise.all(accounts.map(refreshAccount));
  return refreshed.map(accountView);
};

/** OAuth URL that sends the owner to Stripe to connect an account. */
export const getConnectUrl = async (userId: string, formId: string) => {
  const form = await assertCanManagePayments(userId, formId);
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

  // Best effort: if Stripe is momentarily unreachable the account still links,
  // and a later refresh/webhook fills in the capability flags.
  const snapshot = await retrieveAccount(accountId).catch(() => null);
  const fields = snapshot ? snapshotFields(snapshot) : {};

  if (payload.workspaceId) {
    const workspace = await Workspace.findById(payload.workspaceId);
    if (!workspace) throw new ApiError(httpStatus.NOT_FOUND, "Workspace not found");

    const existing = workspace.stripeAccounts.find(
      (account) => account.accountId === accountId
    );
    if (existing) {
      Object.assign(existing, fields);
    } else {
      workspace.stripeAccounts.push({
        accountId,
        name: accountName,
        connectedAt: new Date(),
        connectedBy: new mongoose.Types.ObjectId(payload.userId),
        ...fields,
      });
    }
    await workspace.save();
  } else {
    // Workspace-less form: the creator owns the connected account.
    const user = await User.findById(payload.userId);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

    const existing = user.stripeAccounts.find(
      (account) => account.accountId === accountId
    );
    if (existing) {
      Object.assign(existing, fields);
    } else {
      user.stripeAccounts.push({
        accountId,
        name: accountName,
        connectedAt: new Date(),
        ...fields,
      });
    }
    await user.save();
  }

  return `${env.frontendUrl}/form-builder/${payload.formId}?stripe=connected`;
};

/** Shared: the account must be connected to the form's own scope. */
const assertManageableAccount = async (
  userId: string,
  formId: string,
  accountId: string
) => {
  const form = await assertCanManagePayments(userId, formId);
  const accounts = await readScopedAccounts(resolveAccountScope(form));
  const account = accounts.find((item) => item.accountId === accountId);
  if (!account) {
    throw new ApiError(httpStatus.NOT_FOUND, "That Stripe account is not connected.");
  }
  return { form, account };
};

/** Fresh onboarding link for an account Stripe still needs information from. */
export const getAccountOnboardingUrl = async (
  userId: string,
  formId: string,
  accountId: string
) => {
  await assertManageableAccount(userId, formId, accountId);
  const base = `${env.frontendUrl}/form-builder/${formId}`;
  const { url } = await createAccountOnboardingLink(accountId, {
    refreshUrl: `${base}?stripe=refresh`,
    returnUrl: `${base}?stripe=connected`,
  });
  return { url };
};

/** Short-lived link into the owner's own Stripe dashboard. */
export const getAccountDashboardUrl = async (
  userId: string,
  formId: string,
  accountId: string
) => {
  await assertManageableAccount(userId, formId, accountId);
  const { url } = await createDashboardLink(accountId);
  return { url };
};

/**
 * Disconnect the local connection. The owner's Stripe account is not deleted;
 * only the platform's access is revoked, and historical payments are kept.
 */export const disconnectStripeAccount = async (
  userId: string,
  formId: string,
  accountId: string
) => {
  const form = await assertCanManagePayments(userId, formId);
  const scope = resolveAccountScope(form);
  const accounts = await readScopedAccounts(scope);
  if (!accounts.some((account) => account.accountId === accountId)) {
    throw new ApiError(httpStatus.NOT_FOUND, "That Stripe account is not connected.");
  }

  try {
    await deauthorizeAccount(accountId);
  } catch (error) {
    // Revoking locally must still work if Stripe already dropped the link.
    console.error(
      "Stripe deauthorize failed:",
      error instanceof Error ? error.message : error
    );
  }

  if (scope.kind === "workspace") {
    await Workspace.updateOne(
      { _id: scope.id },
      { $pull: { stripeAccounts: { accountId } } }
    );
  } else {
    await User.updateOne(
      { _id: scope.id },
      { $pull: { stripeAccounts: { accountId } } }
    );
  }

  return { disconnected: true };
};

/** Create a hosted Checkout Session for a published payment page. */
export const createPublicPaymentSession = async (
  slug: string,
  data: {
    pageKey: string;
    email?: string;
    respondentSessionId?: string;
  }
) => {
  const { form, version } = await findPublicFormWithVersion(slug);
  const page = findPaymentPage(version, data.pageKey);
  const settings = readPaymentSettings(page);

  // Resolve the account from the form's own connection, never from the client.
  const accounts = await readScopedAccounts(resolveAccountScope(form));
  const account = accounts.find((item) => item.accountId === settings.accountId);
  if (!account) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This form's Stripe account is no longer connected."
    );
  }
  if (account.chargesEnabled !== true) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This form cannot accept payments yet. The owner needs to finish Stripe setup."
    );
  }

  const applicationFeeMinor =
    env.stripePlatformFeeBps > 0
      ? Math.round((settings.amount * env.stripePlatformFeeBps) / 10000)
      : 0;

  // Retrying checkout reuses the open session instead of charging twice.
  if (data.respondentSessionId) {
    const pending = await FormPayment.findOne({
      formId: form._id,
      pageKey: page.pageKey,
      respondentSessionId: data.respondentSessionId,
      status: "pending",
    }).sort({ createdAt: -1 });

    if (pending?.checkoutSessionId) {
      const open = await retrieveCheckoutSession(
        settings.accountId,
        pending.checkoutSessionId
      ).catch(() => null);
      if (open?.status === "open" && open.url) {
        return { id: open.id, url: open.url, paymentId: String(pending._id) };
      }
      if (open && open.payment_status === "paid") {
        pending.status = "paid";
        pending.paidAt = pending.paidAt || new Date();
        await pending.save();
      } else if (open) {
        pending.status = "canceled";
        await pending.save();
      }
    }
  }

  const returnUrl = `${env.frontendUrl}/form/${form.slug}`;
  // Stripe replaces {CHECKOUT_SESSION_ID} itself; keep it unencoded.
  const successUrl = `${returnUrl}?payment=success&payment_page=${encodeURIComponent(
    page.pageKey
  )}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${returnUrl}?payment=cancelled&payment_page=${encodeURIComponent(
    page.pageKey
  )}`;

  // The placeholder keeps the unique index satisfied until Stripe responds.
  const placeholderId = `pending_${new mongoose.Types.ObjectId().toString()}`;
  const payment = await FormPayment.create({
    formId: form._id,
    ownerId: form.createdBy,
    workspaceId: form.workspaceId || undefined,
    respondentSessionId: data.respondentSessionId || "",
    pageKey: page.pageKey,
    stripeAccountId: settings.accountId,
    checkoutSessionId: placeholderId,
    amountMinor: settings.amount,
    currency: settings.currency,
    applicationFeeMinor,
    status: "pending",
    customerEmail: data.email || "",
  });

  try {
    const session = await createCheckoutSession(settings.accountId, {
      currency: settings.currency,
      amount: settings.amount,
      title: page.title || page.label || "Payment",
      formTitle: form.title,
      allowInstallments: settings.allowInstallments,
      email: data.email,
      applicationFeeMinor,
      idempotencyKey: `checkout_${String(payment._id)}`,
      metadata: {
        formId: String(form._id),
        pageKey: page.pageKey,
        sessionId: data.respondentSessionId || "",
        paymentId: String(payment._id),
      },
      successUrl,
      cancelUrl,
    });

    payment.checkoutSessionId = session.id;
    payment.checkoutUrl = session.url;
    await payment.save();

    return { id: session.id, url: session.url, paymentId: String(payment._id) };
  } catch (error) {
    await FormPayment.updateOne(
      { _id: payment._id },
      { $set: { status: "failed" } }
    ).catch(() => undefined);
    throw error;
  }
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

  // Mirror the authoritative status into the platform's transaction record.
  const $set = {
    status: "paid" as const,
    paymentIntentId: session.payment_intent || undefined,
    paidAt: new Date(),
    amountMinor: session.amount_total ?? settings.amount,
    currency: session.currency ?? settings.currency,
    customerEmail: session.customer_details?.email || undefined,
  };
  await FormPayment.updateOne({ checkoutSessionId: session.id }, { $set });

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
  return { ...payment, pageKey: page.pageKey, paymentRecordId: await paymentRecordId(sessionId) };
};

const paymentRecordId = async (checkoutSessionId: string) => {
  const record = await FormPayment.findOne({ checkoutSessionId })
    .select("_id")
    .lean();
  return record?._id ? String(record._id) : "";
};

/**
 * Called on submit: every visible payment page must carry a paid session, and
 * the stored value is rebuilt from Stripe rather than trusted from the client.
 * Returns the verified checkout session ids so the caller can link the newly
 * saved submission to its payment records.
 */
export const verifySubmissionPayments = async (args: {
  formId: string;
  version: any;
  answers: any[];
  hiddenPageKeys?: Set<string>;
}): Promise<string[]> => {
  const pages: PaymentPage[] = (args.version?.formSchema?.pages || []).filter(
    (p: PaymentPage) => p?.type === "payment" && p?.isActive !== false
  );
  if (pages.length === 0) return [];

  const verified: string[] = [];
  for (const page of pages) {
    // Hidden payment pages are not charged. Drop any client-supplied answer so
    // a forged "paid" value can never appear in the owner's response data.
    if (args.hiddenPageKeys?.has(page.pageKey)) {
      const index = args.answers.findIndex(
        (a) => a.pageKey === page.pageKey || a.blockKey === page.pageKey
      );
      if (index >= 0) args.answers.splice(index, 1);
      continue;
    }

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
    verified.push(sessionId);
  }

  return verified;
};

/** Attach the saved response to its payment attempts (one attempt per page). */
export const linkSubmissionPayments = async (
  checkoutSessionIds: string[],
  submissionId: mongoose.Types.ObjectId | string
): Promise<void> => {
  if (checkoutSessionIds.length === 0) return;
  await FormPayment.updateMany(
    { checkoutSessionId: { $in: checkoutSessionIds } },
    { $set: { submissionId } }
  );
};

/* -------------------------------------------------------------------------- */
/* Owner payment history                                                      */
/* -------------------------------------------------------------------------- */

const ownerScopeFilter = async (userId: string) => {
  // Payments are financial data: only the form owner and workspace admins can
  // see them. Ordinary members/editors keep access to the forms, not the money.
  const workspaceIds = await Workspace.find({
    $or: [
      { createdBy: userId },
      { members: { $elemMatch: { userId, role: "admin" } } },
    ],
  }).distinct("_id");

  return {
    $or: [
      { ownerId: new mongoose.Types.ObjectId(userId) },
      { workspaceId: { $in: workspaceIds } },
    ],
  } as Record<string, unknown>;
};

const paymentView = (payment: any) => {
  const form = payment.formId;
  return {
    id: String(payment._id),
    formId: String(form?._id || form || payment.formId),
    formTitle: form?.title || "",
    formSlug: form?.slug || "",
    submissionId: payment.submissionId ? String(payment.submissionId) : "",
    pageKey: payment.pageKey,
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    applicationFeeMinor: payment.applicationFeeMinor,
    refundAmountMinor: payment.refundAmountMinor,
    refundableMinor: Math.max(
      0,
      payment.amountMinor - payment.refundAmountMinor
    ),
    status: payment.status,
    customerEmail: payment.customerEmail || "",
    paidAt: payment.paidAt || null,
    createdAt: payment.createdAt,
    checkoutSessionId: payment.checkoutSessionId,
    paymentIntentId: payment.paymentIntentId || "",
    stripeAccountId: payment.stripeAccountId,
  };
};

export const listPayments = async (
  userId: string,
  query: {
    formId?: string;
    status?: string;
    currency?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }
) => {
  const filter: Record<string, any> = await ownerScopeFilter(userId);
  if (query.formId) filter.formId = query.formId;
  if (query.status) filter.status = query.status;
  if (query.currency) filter.currency = query.currency;
  if (query.from || query.to) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    // Date-only filters include the whole `to` day.
    if (to && query.to && /^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
      to.setUTCHours(23, 59, 59, 999);
    }
    filter.createdAt = {
      ...(from && !Number.isNaN(from.getTime()) ? { $gte: from } : {}),
      ...(to && !Number.isNaN(to.getTime()) ? { $lte: to } : {}),
    };
  }

  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 25));
  const [items, total] = await Promise.all([
    FormPayment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("formId", "title slug")
      .lean(),
    FormPayment.countDocuments(filter),
  ]);

  return { items: items.map(paymentView), total, page, limit };
};

export const getPaymentsOverview = async (userId: string) => {
  const filter = await ownerScopeFilter(userId);
  const groups = await FormPayment.aggregate([
    { $match: filter },
    {
      $group: {
        _id: { currency: "$currency", status: "$status" },
        count: { $sum: 1 },
        amount: { $sum: "$amountMinor" },
        refunded: { $sum: "$refundAmountMinor" },
      },
    },
  ]);

  const successStatuses = new Set([
    "paid",
    "partially_refunded",
    "refunded",
    "disputed",
  ]);
  const currencies = new Map<
    string,
    { currency: string; paidCount: number; grossAmount: number; refundedAmount: number; pendingCount: number }
  >();

  for (const group of groups) {
    const currency = group._id.currency as string;
    const entry =
      currencies.get(currency) ||
      {
        currency,
        paidCount: 0,
        grossAmount: 0,
        refundedAmount: 0,
        pendingCount: 0,
      };
    if (successStatuses.has(group._id.status)) {
      entry.paidCount += group.count;
      entry.grossAmount += group.amount;
      entry.refundedAmount += group.refunded;
    } else if (group._id.status === "pending" || group._id.status === "processing") {
      entry.pendingCount += group.count;
    }
    currencies.set(currency, entry);
  }

  return { currencies: [...currencies.values()] };
};

const findOwnedPayment = async (userId: string, paymentId: string) => {
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    throw new ApiError(httpStatus.NOT_FOUND, "Payment not found");
  }
  const filter: Record<string, any> = {
    _id: paymentId,
    ...(await ownerScopeFilter(userId)),
  };
  const payment = await FormPayment.findOne(filter).populate("formId", "title slug");
  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Payment not found");
  }
  return payment;
};

export const getPayment = async (userId: string, paymentId: string) => {
  const payment = await findOwnedPayment(userId, paymentId);
  return paymentView(payment.toObject());
};

export const refundPayment = async (
  userId: string,
  paymentId: string,
  amountMinor?: number
) => {
  const payment = await findOwnedPayment(userId, paymentId);

  if (payment.status !== "paid" && payment.status !== "partially_refunded") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Only a paid payment can be refunded."
    );
  }
  if (!payment.paymentIntentId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This payment has no Stripe payment reference to refund."
    );
  }

  const refundable = payment.amountMinor - payment.refundAmountMinor;
  const amount = amountMinor ?? refundable;
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Refund amount must be positive.");
  }
  if (amount > refundable) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Refund amount exceeds the refundable balance."
    );
  }

  // Direct charges: the refund must run in the connected account context.
  const refund = await createRefund(payment.stripeAccountId, {
    paymentIntentId: payment.paymentIntentId,
    amountMinor: amount,
  });
  if (refund.status === "failed" || refund.status === "canceled") {
    throw new ApiError(
      httpStatus.BAD_GATEWAY,
      "Stripe could not complete the refund. Please try again."
    );
  }

  payment.refundAmountMinor += refund.amount;
  payment.status =
    payment.refundAmountMinor >= payment.amountMinor
      ? "refunded"
      : "partially_refunded";
  await payment.save();

  return paymentView(
    (await payment.populate("formId", "title slug")).toObject()
  );
};
