import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { nanoid } from "nanoid";
import mongoose from "mongoose";
import { Form, normalizeFormSettings } from "../../models/Form";
import { FormVersion } from "../../models/FormVersion";
import { FormResponse } from "../../models/FormResponse";
import {
  ClosedFormStatus,
  closedFormReason,
  formStatus,
  isClosedFormStatus,
} from "../../constants/status";
import { buildFormTheme } from "../forms/form.theme";

const buildFormLookupQuery = (slugOrId: string) => {
  if (mongoose.Types.ObjectId.isValid(slugOrId)) {
    return { $or: [{ slug: slugOrId }, { _id: slugOrId }] };
  }
  return { slug: slugOrId };
};

/**
 * Used for forms that were never live (draft/archived) and for slugs that do
 * not exist, so the two cases stay indistinguishable to the public.
 */
const notFoundError = () =>
  new ApiError(httpStatus.NOT_FOUND, "Form not found or not published");

/**
 * A form that was live and is now closed exists as far as the respondent is
 * concerned, so it answers 410 with a machine-readable reason the client can
 * use to render a closed-form screen.
 */
const closedFormError = (status: ClosedFormStatus, title: string) => {
  const reason = closedFormReason[status];
  return new ApiError(httpStatus.GONE, reason.message, [
    { code: reason.code, status, title },
  ]);
};

const findPublicForm = async (slugOrId: string) => {
  const form = await Form.findOne(buildFormLookupQuery(slugOrId)).lean();
  if (!form) {
    throw notFoundError();
  }

  if (isClosedFormStatus(form.status)) {
    throw closedFormError(form.status, form.title);
  }

  if (form.status !== formStatus.PUBLISHED || !form.publishedVersionId) {
    throw notFoundError();
  }

  // Re-stated so callers get a non-nullable publishedVersionId.
  return { ...form, publishedVersionId: form.publishedVersionId };
};

const findPublicFormWithVersion = async (slugOrId: string) => {
  const form = await findPublicForm(slugOrId);

  const version = await FormVersion.findById(form.publishedVersionId).lean();
  if (!version) {
    throw new ApiError(httpStatus.NOT_FOUND, "Published form version not found");
  }

  return { form, version };
};

/**
 * Settings a respondent-facing client needs to render/interact with the form.
 *
 * Everything else is stripped: owner notifications (`emailSettings`), admin
 * scheduling/compliance (`access`), and server-injected hidden fields
 * (`hiddenFields`). The value is normalized first so missing or legacy stored
 * groups still resolve their defaults — in particular `variables`, which the
 * client uses for dynamic price/score values.
 */
export const buildPublicFormSettings = (stored: any) => {
  const full = normalizeFormSettings(stored);
  return {
    oneQuestionAtATime: full.oneQuestionAtATime,
    showProgressBar: full.showProgressBar,
    allowMultipleSubmissions: full.allowMultipleSubmissions,
    requireLogin: full.requireLogin,
    general: full.general,
    variables: full.variables,
  };
};

export const getPublicForm = async (slugOrId: string): Promise<any> => {
  const { form, version } = await findPublicFormWithVersion(slugOrId);

  return {
    id: form._id,
    title: form.title,
    slug: form.slug,
    status: form.status,
    formVersionId: version._id,
    version: version.version,
    pages: version.formSchema.pages,
    endPages: version.formSchema.endPages || [],
    theme: buildFormTheme(version.formSchema.theme),
    settings: buildPublicFormSettings(version.formSchema.settings),
    createdBy: form.createdBy,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  };
};

export const getFormSchema = async (slugOrId: string): Promise<any> => {
  const { form, version } = await findPublicFormWithVersion(slugOrId);

  const pages = (version.formSchema.pages || [])
    .filter((f: any) => f.isActive)
    .sort((a: any, b: any) => a.order - b.order)
    .map(({ logic, ...rest }: any) => rest);

  const endPages = (version.formSchema.endPages || [])
    .sort((a: any, b: any) => a.order - b.order);

  return {
    form: {
      id: form._id,
      title: form.title,
      version: version.version,
      formVersionId: version._id,
      settings: buildPublicFormSettings(version.formSchema.settings),
    },
    pages,
    endPages,
  };
};

export const getFormTheme = async (slugOrId: string): Promise<any> => {
  const { form, version } = await findPublicFormWithVersion(slugOrId);

  return {
    title: form.title,
    theme: buildFormTheme(version.formSchema.theme),
  };
};

export const getFormPreview = async (slugOrId: string): Promise<any> => {
  const form = await Form.findOne(buildFormLookupQuery(slugOrId)).lean();
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  let versionId = form.publishedVersionId || form.draftVersionId;
  let pages: any[] = [];
  let endPages: any[] = form.endPages || [];
  let theme = form.theme;
  let settings = form.settings;

  if (versionId) {
    const version = await FormVersion.findById(versionId).lean();
    if (version) {
      pages = (version.formSchema.pages || [])
        .filter((f: any) => f.isActive)
        .sort((a: any, b: any) => a.order - b.order);
      endPages = (version.formSchema.endPages || [])
        .sort((a: any, b: any) => a.order - b.order);
      theme = version.formSchema.theme;
      settings = version.formSchema.settings;
    }
  }

  return {
    form: {
      ...form,
      theme: buildFormTheme(theme),
      settings: buildPublicFormSettings(settings),
    },
    pages,
    endPages,
  };
};

export const submitForm = async (
  slugOrId: string,
  data: { answers: any[]; sessionId?: string },
  metadata?: any
): Promise<any> => {
  const form = await findPublicForm(slugOrId);

  const response = await FormResponse.create({
    formId: form._id,
    formVersionId: form.publishedVersionId,
    answers: data.answers,
    sessionId: data.sessionId || `session_${nanoid()}`,
    metadata: {
      ipAddress: metadata?.ip || "",
      userAgent: metadata?.userAgent || "",
      referrer: metadata?.referrer || "",
    },
    submittedAt: new Date(),
  });

  return {
    submissionId: response._id,
    formVersionId: form.publishedVersionId,
    message: "Form submitted successfully",
  };
};

export const saveDraft = async (
  slugOrId: string,
  data: { answers: any[]; sessionId?: string }
): Promise<any> => {
  const form = await findPublicForm(slugOrId);

  const response = await FormResponse.create({
    formId: form._id,
    formVersionId: form.publishedVersionId,
    answers: data.answers,
    sessionId: data.sessionId || `draft_${nanoid()}`,
    submittedAt: new Date(),
  });

  return {
    submissionId: response._id,
    formVersionId: form.publishedVersionId,
    sessionId: response.sessionId,
    message: "Draft saved successfully",
  };
};

/**
 * Stays reachable after the form is unpublished or cancelled: a respondent who
 * already submitted can still look their submission up.
 */
export const getSubmitStatus = async (
  slugOrId: string,
  submissionId: string
): Promise<any> => {
  const form = await Form.findOne(buildFormLookupQuery(slugOrId)).lean();
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  const response = await FormResponse.findOne({
    _id: submissionId,
    formId: form._id,
  }).lean();

  if (!response) {
    throw new ApiError(httpStatus.NOT_FOUND, "Submission not found");
  }

  return {
    submissionId: response._id,
    formVersionId: response.formVersionId,
    submittedAt: response.submittedAt,
    status: "completed",
  };
};
