import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { generateUniqueSlug } from "../../utils/slug";
import { getPaginationMeta } from "../../utils/pagination";
import * as formRepo from "./form.repository";
import { FormVersion } from "../../models/FormVersion";
import { Form } from "../../models/Form";
import { createInitialVersion, ensureDraftVersion } from "./version.helper";
import { buildFormTheme } from "./form.theme";
import {
  ClosedFormStatus,
  formStatus,
  isClosedFormStatus,
} from "../../constants/status";
import {
  CreateFormBody,
  UpdateFormBody,
  UpdateFormSettingsBody,
  UpdateFormThemeBody,
  UpdateFormShareBody,
  FormResponse,
} from "./form.types";

const toFormResponse = async (form: any): Promise<FormResponse> => {
  let draftVersion: any = null;
  if (form.draftVersionId) {
    draftVersion = await FormVersion.findById(form.draftVersionId).lean();
  }

  // Filled in against the defaults so forms created before a theme property
  // existed still return a complete appearance object.
  const theme = buildFormTheme(draftVersion?.formSchema?.theme || form.theme);
  const pages = draftVersion?.formSchema?.pages || form.pages || [];
  const endPages = draftVersion?.formSchema?.endPages || form.endPages || [];
  const settings = draftVersion?.formSchema?.settings || form.settings || {
    oneQuestionAtATime: true,
    showProgressBar: true,
    allowMultipleSubmissions: true,
    requireLogin: false,
    collectIP: false,
  };

  return {
    id: form._id.toString(),
    title: form.title,
    slug: form.slug,
    status: form.status,
    draftVersionId: form.draftVersionId?.toString(),
    publishedVersionId: form.publishedVersionId?.toString() || null,
    hasUnpublishedChanges: !!form.hasUnpublishedChanges,
    version: draftVersion?.version || 1,
    theme,
    pages,
    endPages,
    settings,
    createdBy: form.createdBy?._id?.toString() || form.createdBy?.toString(),
    updatedBy: form.updatedBy?.toString(),
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  };
};

export const createForm = async (
  userId: string,
  data: CreateFormBody,
): Promise<FormResponse> => {
  const slug = await generateUniqueSlug(data.title, formRepo.checkSlugExists);
  const form = await formRepo.createForm({
    title: data.title,
    slug,
    createdBy: userId,
  });

  const v1 = await createInitialVersion(form._id, userId);
  form.draftVersionId = v1._id as any;
  form.publishedVersionId = null;
  form.hasUnpublishedChanges = false;
  form.status = formStatus.DRAFT;
  await form.save();

  return toFormResponse(form);
};

export const getAllForms = async (
  userId: string,
  skip: number,
  limit: number,
  sort: Record<string, 1 | -1>,
  filter: Record<string, any> = {},
) => {
  const query = { ...filter, createdBy: userId };
  const [forms, total] = await Promise.all([
    formRepo.findAllForms(skip, limit, sort, query),
    formRepo.countForms(query),
  ]);
  const formResponses = await Promise.all(forms.map(toFormResponse));
  return {
    forms: formResponses,
    meta: getPaginationMeta(total, Math.floor(skip / limit) + 1, limit),
  };
};

export const getFormById = async (formId: string): Promise<FormResponse> => {
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
  return toFormResponse(form);
};

export const updateForm = async (
  formId: string,
  data: UpdateFormBody,
): Promise<FormResponse> => {
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  await ensureDraftVersion(form);

  if (data.title !== undefined) {
    const existingForm = await formRepo.checkTitleExists(data.title, formId);
    if (existingForm) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Form with this title already exists");
    }
    form.title = data.title;
  }

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
  }
  await form.save();

  return toFormResponse(form);
};

export const deleteForm = async (formId: string): Promise<void> => {
  const form = await formRepo.deleteForm(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
  await FormVersion.deleteMany({ formId });
};

export const duplicateForm = async (
  userId: string,
  formId: string,
  title: string,
): Promise<FormResponse> => {
  const original = await formRepo.findFormById(formId);
  if (!original) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  const origVersion = await ensureDraftVersion(original, userId);

  const formTitle = title || original.title + " (copy)";
  const slug = await generateUniqueSlug(
    formTitle,
    formRepo.checkSlugExists,
  );

  const newForm = await formRepo.createForm({
    title: formTitle,
    slug,
    createdBy: userId,
  });

  const v1 = await createInitialVersion(newForm._id, userId, {
    pages: JSON.parse(JSON.stringify(origVersion.formSchema.pages || [])),
    settings: JSON.parse(JSON.stringify(origVersion.formSchema.settings || {})),
    theme: buildFormTheme(origVersion.formSchema.theme),
  });

  newForm.draftVersionId = v1._id as any;
  newForm.publishedVersionId = null;
  newForm.hasUnpublishedChanges = false;
  newForm.status = formStatus.DRAFT;
  await newForm.save();

  return toFormResponse(newForm);
};

export const archiveForm = async (formId: string): Promise<FormResponse> => {
  const form = await formRepo.updateForm(formId, { status: formStatus.ARCHIVED });
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
  return toFormResponse(form);
};

export const restoreForm = async (formId: string): Promise<FormResponse> => {
  const form = await formRepo.updateForm(formId, { status: formStatus.DRAFT });
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
  return toFormResponse(form);
};

export const publishForm = async (formId: string): Promise<FormResponse> => {
  const form = await formRepo.findFormById(formId);

  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  // Re-publishing a form that was unpublished or cancelled without any edits
  // in between restores the exact version that was live before, rather than
  // promoting a freshly cloned draft.
  if (isClosedFormStatus(form.status) && form.publishedVersionId && !form.hasUnpublishedChanges) {
    const publishedVersion = await FormVersion.findById(form.publishedVersionId);
    if (publishedVersion) {
      form.status = formStatus.PUBLISHED;
      form.draftVersionId = publishedVersion._id as any;
      form.hasUnpublishedChanges = false;
      form.pages = publishedVersion.formSchema.pages as any;
      form.settings = publishedVersion.formSchema.settings as any;
      form.theme = publishedVersion.formSchema.theme as any;
      await form.save();
      return toFormResponse(form);
    }
  }

  const draftVersion = await ensureDraftVersion(form);
  form.publishedVersionId = draftVersion._id as any;
  form.status = formStatus.PUBLISHED;
  form.hasUnpublishedChanges = false;

  // Sync schema to Form document for backwards compatibility
  form.pages = draftVersion.formSchema.pages as any;
  form.settings = draftVersion.formSchema.settings as any;
  form.theme = draftVersion.formSchema.theme as any;

  await form.save();
  return toFormResponse(form);
};

/**
 * Takes a live form down. The published version is retained so the form can be
 * published again unchanged, and so existing responses keep a resolvable
 * version reference.
 */
export const unpublishForm = async (formId: string): Promise<FormResponse> => {
  return closePublishedForm(formId, formStatus.UNPUBLISHED);
};

/** Permanently closes a live form. Retains the published version like unpublish. */
export const cancelForm = async (formId: string): Promise<FormResponse> => {
  return closePublishedForm(formId, formStatus.CANCELLED);
};

const closePublishedForm = async (
  formId: string,
  status: ClosedFormStatus,
): Promise<FormResponse> => {
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  if (form.status === status) {
    return toFormResponse(form);
  }

  if (form.status !== formStatus.PUBLISHED && !isClosedFormStatus(form.status)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Only a published form can be ${status}`,
    );
  }

  form.status = status;
  await form.save();
  return toFormResponse(form);
};

export const discardDraft = async (formId: string): Promise<FormResponse> => {
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  if (
    form.hasUnpublishedChanges &&
    form.publishedVersionId &&
    form.draftVersionId &&
    form.draftVersionId.toString() !== form.publishedVersionId.toString()
  ) {
    await FormVersion.findByIdAndDelete(form.draftVersionId);
    form.draftVersionId = form.publishedVersionId;
    form.hasUnpublishedChanges = false;
    await form.save();
  }

  return toFormResponse(form);
};

export const getFormVersions = async (formId: string): Promise<any[]> => {
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  const versions = await FormVersion.find({ formId: form._id })
    .sort({ version: -1 })
    .lean();

  return versions.map((v) => ({
    id: v._id.toString(),
    formId: v.formId.toString(),
    version: v.version,
    isPublished: form.publishedVersionId?.toString() === v._id.toString(),
    isDraft: form.draftVersionId?.toString() === v._id.toString(),
    createdBy: v.createdBy.toString(),
    createdAt: v.createdAt,
    formSchema: v.formSchema,
  }));
};

export const getFormSlug = async (
  formId: string,
): Promise<{ slug: string; publicUrl: string }> => {
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
  return {
    slug: form.slug,
    publicUrl: `/public/forms/${form.slug}`,
  };
};

export const updateFormSettings = async (
  formId: string,
  data: UpdateFormSettingsBody,
): Promise<FormResponse> => {
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  const draftVersion = await ensureDraftVersion(form);
  draftVersion.formSchema.settings = {
    ...draftVersion.formSchema.settings,
    ...data,
  };

  draftVersion.markModified("formSchema");
  await draftVersion.save();

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
    await form.save();
  }

  return toFormResponse(form);
};

export const updateFormTheme = async (
  formId: string,
  data: UpdateFormThemeBody,
): Promise<FormResponse> => {
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  const draftVersion = await ensureDraftVersion(form);
  draftVersion.formSchema.theme = buildFormTheme(draftVersion.formSchema.theme, data);

  draftVersion.markModified("formSchema");
  await draftVersion.save();

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
    await form.save();
  }

  return toFormResponse(form);
};

export const updateFormShare = async (
  formId: string,
  data: UpdateFormShareBody,
): Promise<any> => {
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  const share = await formRepo.upsertFormShare(formId, data);
  return {
    formId: share.formId.toString(),
    publicUrl: share.publicUrl,
    isPublic: share.isPublic,
    password: share.password ? "****" : "",
    expiresAt: share.expiresAt,
  };
};
