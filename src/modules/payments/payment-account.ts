/**
 * Shared account-scoping helpers for Stripe Connect payments.
 *
 * Accounts belong to the form's workspace, or — for workspace-less forms —
 * to the form's creator. Used by the payment endpoints, the page save path
 * (so a form can only charge an account its owner connected) and the publish
 * path (so a form never goes live with a payment page that cannot charge).
 */
import { Form } from "../../models/Form";
import { Workspace } from "../../models/Workspace";
import { User } from "../../models/User";
import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { MIN_PAYMENT_AMOUNT } from "../../constants/pageTypes";

export interface ConnectedStripeAccount {
  accountId: string;
  name?: string;
  connectedAt?: Date | string;
}

export interface AccountScope {
  kind: "workspace" | "user";
  id: string;
}

export interface PaymentPage {
  pageKey: string;
  title?: string;
  label?: string;
  type?: string;
  isActive?: boolean;
  blocks?: Array<{ isActive?: boolean }>;
  questions?: Array<{ isActive?: boolean }>;
  settings?: {
    payment?: {
      stripeAccountId?: string;
      currency?: string;
      amount?: number;
      allowInstallments?: boolean;
      receiptEmailKey?: string;
    };
  };
}

const pageLabel = (page: PaymentPage): string =>
  page.title || page.label || "Payment page";

/** Accounts live on the form's workspace, or on the creator for workspace-less forms. */
export const resolveAccountScope = (form: any): AccountScope => {
  if (form.workspaceId) {
    return { kind: "workspace", id: String(form.workspaceId) };
  }
  const creatorId = String(form.createdBy?._id || form.createdBy || "");
  return { kind: "user", id: creatorId };
};

export const readScopedAccounts = async (
  scope: AccountScope
): Promise<ConnectedStripeAccount[]> => {
  if (!scope.id) return [];
  const doc =
    scope.kind === "workspace"
      ? await Workspace.findById(scope.id).lean()
      : await User.findById(scope.id).lean();
  return ((doc as any)?.stripeAccounts || []) as ConnectedStripeAccount[];
};

/** Loads the form together with the Stripe accounts its owner connected. */
export const loadFormAccounts = async (formId: string) => {
  const form = await Form.findById(formId).lean();
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
  const scope = resolveAccountScope(form);
  const accounts = await readScopedAccounts(scope);
  return { form, scope, accounts };
};

/**
 * A payment page may only charge an account that belongs to the form owner.
 * Without this, a stale or hand-crafted `stripeAccountId` could silently send
 * the respondent's money somewhere other than the form owner.
 */
export const assertAccountConnected = (
  accounts: ConnectedStripeAccount[],
  accountId: string,
  pageTitle?: string
): void => {
  if (accounts.some((account) => account.accountId === accountId)) return;
  throw new ApiError(
    httpStatus.BAD_REQUEST,
    pageTitle
      ? `The Stripe account for "${pageTitle}" is not connected to this form. Reconnect Stripe and pick an account again.`
      : "That Stripe account is not connected to this form. Reconnect Stripe and pick an account again."
  );
};

/** Used by page create/update when a payment account is chosen. */
export const assertPaymentAccountSaved = async (
  formId: string,
  settings: unknown
): Promise<void> => {
  const accountId = (settings as any)?.payment?.stripeAccountId;
  if (!accountId) return;
  const { accounts } = await loadFormAccounts(formId);
  assertAccountConnected(accounts, accountId);
};

/**
 * Publish guard: every live payment page must point at a currently connected
 * account and charge a Stripe-valid amount. Called before a draft becomes the
 * published version.
 */
export const assertPaymentPagesReady = (
  pages: PaymentPage[] | undefined,
  accounts: ConnectedStripeAccount[]
): void => {
  const paymentPages = (pages || []).filter(
    (page) => page?.type === "payment" && page.isActive !== false
  );

  for (const page of paymentPages) {
    const settings = page.settings?.payment;
    const title = pageLabel(page);

    // A page that also asks other questions would make the respondent pay
    // without those answers ever being collected.
    const blocks = (page.blocks || page.questions || []).filter(
      (block) => block?.isActive !== false
    );
    if (blocks.length > 1) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `"${title}" mixes a payment with other questions. Move them to separate pages before publishing this form.`
      );
    }

    if (!settings?.stripeAccountId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Connect a Stripe account to "${title}" before publishing this form.`
      );
    }
    if (!settings.amount || settings.amount < MIN_PAYMENT_AMOUNT) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Set an amount of at least ${(MIN_PAYMENT_AMOUNT / 100).toFixed(2)} on "${title}" before publishing this form.`
      );
    }
    assertAccountConnected(accounts, settings.stripeAccountId, title);
  }
};
