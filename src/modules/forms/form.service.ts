import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { generateUniqueSlug } from "../../utils/slug";
import { getPaginationMeta } from "../../utils/pagination";
import * as formRepo from "./form.repository";
import {
  CreateFormBody,
  UpdateFormBody,
  UpdateFormSettingsBody,
  UpdateFormThemeBody,
  UpdateFormShareBody,
  FormResponse,
} from "./form.types";

const toFormResponse = (form: any): FormResponse => ({
  id: form._id.toString(),
  title: form.title,
  slug: form.slug,
  status: form.status,
  theme: form.theme,
  fields: form.fields,
  settings: form.settings,
  createdBy: form.createdBy?._id?.toString() || form.createdBy?.toString(),
  updatedBy: form.updatedBy?.toString(),
  createdAt: form.createdAt,
  updatedAt: form.updatedAt,
});

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
  return {
    forms: forms.map(toFormResponse),
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
  const form = await formRepo.updateForm(formId, data);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
  return toFormResponse(form);
};

export const deleteForm = async (formId: string): Promise<void> => {
  const form = await formRepo.deleteForm(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
};

export const duplicateForm = async (
  userId: string,
  formId: string,
): Promise<FormResponse> => {
  const original = await formRepo.findFormById(formId);
  if (!original) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  const slug = await generateUniqueSlug(
    `${original.title} (copy)`,
    formRepo.checkSlugExists,
  );

  const form = await formRepo.createForm({
    title: `${original.title} (copy)`,
    slug,
    createdBy: userId,
  });
  return toFormResponse(form);
};

export const archiveForm = async (formId: string): Promise<FormResponse> => {
  const form = await formRepo.updateForm(formId, { status: "archived" });
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
  return toFormResponse(form);
};

export const restoreForm = async (formId: string): Promise<FormResponse> => {
  const form = await formRepo.updateForm(formId, { status: "draft" });
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
  return toFormResponse(form);
};

export const publishForm = async (formId: string): Promise<FormResponse> => {
  const form = await formRepo.updateForm(formId, { status: "published" });
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
  return toFormResponse(form);
};

export const unpublishForm = async (formId: string): Promise<FormResponse> => {
  const form = await formRepo.updateForm(formId, { status: "draft" });
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
  return toFormResponse(form);
};

export const getFormSlug = async (
  formId: string,
): Promise<{ slug: string }> => {
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }
  return { slug: form.slug };
};

export const updateFormSettings = async (
  formId: string,
  data: UpdateFormSettingsBody,
): Promise<FormResponse> => {
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  const updatedForm = await formRepo.updateForm(formId, {
    settings: { ...form.settings, ...data },
  });
  return toFormResponse(updatedForm!);
};

export const updateFormTheme = async (
  formId: string,
  data: UpdateFormThemeBody,
): Promise<FormResponse> => {
  const form = await formRepo.findFormById(formId);
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  const updatedForm = await formRepo.updateForm(formId, {
    theme: { ...form.theme, ...data },
  });
  return toFormResponse(updatedForm!);
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
