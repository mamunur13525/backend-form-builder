import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { nanoid } from "nanoid";
import { dispatchServerIntegrations } from "./integration-dispatcher";
import mongoose from "mongoose";
import { Form, normalizeFormSettings } from "../../models/Form";
import { FormVersion } from "../../models/FormVersion";
import { FormResponse } from "../../models/FormResponse";
import { FormView } from "../../models/FormView";
import { findLogicsByFormId } from "../logic/logic.repository";
import { resolveFormLogic } from "../../utils/form-logic/evaluate";
import {
  ClosedFormStatus,
  closedFormReason,
  formStatus,
  isClosedFormStatus,
} from "../../constants/status";
import { buildFormTheme } from "../forms/form.theme";
import * as billingService from "../billing/billing.service";

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
  const ga = full.integrations?.["google-analytics"];
  return {
    oneQuestionAtATime: full.oneQuestionAtATime,
    showProgressBar: full.showProgressBar,
    allowMultipleSubmissions: full.allowMultipleSubmissions,
    requireLogin: full.requireLogin,
    general: full.general,
    variables: full.variables,
    googleAnalytics: ga?.enabled && ga?.measurementId
      ? {
          measurementId: ga.measurementId,
          trackFormViews: ga.trackFormViews ?? true,
          trackStepChanges: ga.trackStepChanges ?? true,
          trackSubmissions: ga.trackSubmissions ?? true,
        }
      : undefined,
  };
};

const normalizePagesWithBlocks = (pages: any[]): any[] => {
  return (pages || [])
    .slice()
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
    .map((page: any) => {
      const title = page.title !== undefined ? page.title : (page.label || "");
      const description = page.description !== undefined ? page.description : (page.helperText || "");
      const label = page.label !== undefined ? page.label : title;
      const helperText = page.helperText !== undefined ? page.helperText : description;

      let blocks = page.blocks || page.questions;
      if (!Array.isArray(blocks) || blocks.length === 0) {
        if (page.type) {
          blocks = [
            {
              _id: page._id,
              blockKey: page.pageKey,
              questionKey: page.pageKey,
              title: "", // single question has no question title; page has title
              description: "", // remove description from question
              label: "",
              helperText: "",
              placeholder: page.placeholder || "",
              type: page.type,
              required: page.required || false,
              order: 1,
              coverImage: page.coverImage,
              options: page.options || [],
              validation: page.validation || {},
              settings: page.settings || {},
              appearance: page.appearance || { width: "full", icon: "" },
              isActive: page.isActive !== false,
            },
          ];
        } else {
          blocks = [];
        }
      } else {
        const sortedBlocks = [...blocks].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
        const hasMultiple = sortedBlocks.length > 1;
        blocks = sortedBlocks.map((b: any) => ({
          ...b,
          // Question title is conditional: if page has 1 question, no question title; if multiple, question has title
          title: hasMultiple ? (b.title !== undefined ? b.title : (b.label || "")) : "",
          label: hasMultiple ? (b.label !== undefined ? b.label : (b.title || "")) : "",
          // Remove description from question
          description: "",
          helperText: "",
        }));
      }

      return {
        ...page,
        title,
        description,
        label,
        helperText,
        blocks,
        questions: blocks,
      };
    });
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
    pages: normalizePagesWithBlocks(version.formSchema.pages),
    endPages: version.formSchema.endPages || [],
    // Logic rules (branching / display / calculations) the respondent client
    // evaluates as answers are collected.
    logic: await findLogicsByFormId(String(form._id)),
    theme: buildFormTheme(version.formSchema.theme),
    settings: buildPublicFormSettings(version.formSchema.settings),
    createdBy: form.createdBy,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  };
};

export const getFormSchema = async (slugOrId: string): Promise<any> => {
  const { form, version } = await findPublicFormWithVersion(slugOrId);

  const pages = normalizePagesWithBlocks(
    (version.formSchema.pages || [])
      .filter((f: any) => f.isActive)
      .sort((a: any, b: any) => a.order - b.order)
      .map(({ logic, ...rest }: any) => rest)
  );

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
      pages = normalizePagesWithBlocks(
        (version.formSchema.pages || [])
          .filter((f: any) => f.isActive)
          .sort((a: any, b: any) => a.order - b.order)
      );
      endPages = (version.formSchema.endPages || [])
        .sort((a: any, b: any) => a.order - b.order);
      theme = version.formSchema.theme;
      settings = version.formSchema.settings;
    }
  }

  return {
    form: {
      ...form,
      logic: await findLogicsByFormId(String(form._id)),
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

  // Enforce the form owner's plan response limit before accepting the
  // submission (Free = 100/month, Pro = 10,000, Team = 100,000).
  await billingService.assertCanAcceptResponse(String(form.createdBy));

  const normalizedAnswers = (data.answers ?? []).map((a: any) => ({
    ...a,
    pageKey: a.pageKey || a.blockKey || "",
    blockKey: a.blockKey || a.pageKey || "",
    questionKey: a.questionKey || a.blockKey || a.pageKey || "",
    label: a.label || a.title || "",
    title: a.title || a.label || "",
  }));

  // Recompute calculation variables server-side from the published version's
  // logic rules so respondents cannot submit spoofed score/price values.
  // Any failure here must never block the submission itself.
  let computedVariables: { name: string; value: any }[] | undefined;
  try {
    const version = await FormVersion.findById(form.publishedVersionId).lean();
    if (version) {
      const pages = (version.formSchema.pages || []).filter(
        (p: any) => p?.isActive && p.pageKey
      );
      const settings = normalizeFormSettings(version.formSchema.settings);
      const rules = await findLogicsByFormId(String(form._id));
      const answerMap: Record<string, unknown> = {};
      for (const answer of normalizedAnswers) {
        if (answer?.pageKey) answerMap[answer.pageKey] = answer.value;
        if (answer?.blockKey) answerMap[answer.blockKey] = answer.value;
      }
      const result = resolveFormLogic({
        pages,
        answers: answerMap,
        variables: settings.variables,
        rules,
      });
      const entries = Object.entries(result.computedVariables);
      if (entries.length > 0) {
        computedVariables = entries.map(([name, value]) => ({ name, value }));
      }
    }
  } catch {
    computedVariables = undefined;
  }

  let response: any;
  if (data.sessionId) {
    response = await FormResponse.findOneAndUpdate(
      { formId: form._id, sessionId: data.sessionId },
      {
        $set: {
          formVersionId: form.publishedVersionId,
          answers: normalizedAnswers,
          computedVariables,
          status: "completed",
          metadata: {
            ipAddress: metadata?.ip || "",
            userAgent: metadata?.userAgent || "",
            referrer: metadata?.referrer || "",
          },
          submittedAt: new Date(),
        },
      },
      { returnDocument: "after", upsert: true }
    );
  } else {
    response = await FormResponse.create({
      formId: form._id,
      formVersionId: form.publishedVersionId,
      answers: normalizedAnswers,
      computedVariables,
      sessionId: `session_${nanoid()}`,
      status: "completed",
      metadata: {
        ipAddress: metadata?.ip || "",
        userAgent: metadata?.userAgent || "",
        referrer: metadata?.referrer || "",
      },
      submittedAt: new Date(),
    });
  }

  // Mark visit as completed in background
  if (data.sessionId) {
    FormView.findOneAndUpdate(
      { formId: form._id, sessionId: data.sessionId },
      { $set: { started: true, completed: true, completedAt: new Date() } }
    ).catch(() => {});
  }

  // Dispatch third-party integrations (Slack, Discord, Telegram, Zapier, etc.)
  // Runs in background so it never slows down or blocks response to respondent
  dispatchServerIntegrations({
    form,
    versionId: form.publishedVersionId,
    submission: response,
    answers: normalizedAnswers,
    computedVariables,
  }).catch((err) => {
    console.error("Integration dispatch error:", err);
  });

  return {
    submissionId: response._id,
    formVersionId: form.publishedVersionId,
    message: "Form submitted successfully",
  };
};

export const saveDraft = async (
  slugOrId: string,
  data: { answers: any[]; sessionId?: string },
  metadata?: any
): Promise<any> => {
  const form = await findPublicForm(slugOrId);
  const sessionId = data.sessionId || `session_${nanoid()}`;

  const normalizedAnswers = (data.answers ?? []).map((a: any) => ({
    ...a,
    pageKey: a.pageKey || a.blockKey || "",
    blockKey: a.blockKey || a.pageKey || "",
    questionKey: a.questionKey || a.blockKey || a.pageKey || "",
    label: a.label || a.title || "",
    title: a.title || a.label || "",
  }));

  let response: any;
  if (data.sessionId) {
    response = await FormResponse.findOneAndUpdate(
      { formId: form._id, sessionId: data.sessionId },
      {
        $set: {
          formVersionId: form.publishedVersionId,
          answers: normalizedAnswers,
          status: "partial",
          submittedAt: new Date(),
          ...(metadata ? {
            metadata: {
              ipAddress: metadata?.ip || "",
              userAgent: metadata?.userAgent || "",
              referrer: metadata?.referrer || "",
            }
          } : {})
        },
      },
      { returnDocument: "after", upsert: true }
    );
  } else {
    response = await FormResponse.create({
      formId: form._id,
      formVersionId: form.publishedVersionId,
      answers: normalizedAnswers,
      sessionId,
      status: "partial",
      metadata: {
        ipAddress: metadata?.ip || "",
        userAgent: metadata?.userAgent || "",
        referrer: metadata?.referrer || "",
      },
      submittedAt: new Date(),
    });
  }

  // Mark visit as started in background
  FormView.findOneAndUpdate(
    { formId: form._id, sessionId },
    { $set: { started: true }, $setOnInsert: { startedAt: new Date() } }
  ).catch(() => {});

  return {
    submissionId: response._id,
    formVersionId: form.publishedVersionId,
    sessionId: response.sessionId,
    message: "Draft saved successfully",
  };
};

export const trackView = async (
  slugOrId: string,
  data: { sessionId?: string; device?: string; referrer?: string },
  metadata?: any
): Promise<any> => {
  const form = await findPublicForm(slugOrId);
  const sessionId = data.sessionId || `session_${nanoid()}`;

  let device: "desktop" | "mobile" | "tablet" = "desktop";
  if (data.device === "mobile" || data.device === "tablet" || data.device === "desktop") {
    device = data.device;
  } else {
    const ua = metadata?.userAgent || "";
    if (/tablet|ipad/i.test(ua)) device = "tablet";
    else if (/mobile|android|iphone/i.test(ua)) device = "mobile";
  }

  const view = await FormView.findOneAndUpdate(
    { formId: form._id, sessionId },
    {
      $setOnInsert: {
        formId: form._id,
        sessionId,
        device,
        ipAddress: metadata?.ip || "",
        userAgent: metadata?.userAgent || "",
        referrer: data.referrer || metadata?.referrer || "",
      },
    },
    { returnDocument: "after", upsert: true }
  );

  return { success: true, sessionId: view.sessionId };
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
