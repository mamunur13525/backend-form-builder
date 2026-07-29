import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { nanoid } from "nanoid";
import { Form } from "../../models/Form";
import { FormResponse } from "../../models/FormResponse";
import { FormShare } from "../../models/FormShare";

export const getPublicForm = async (slug: string): Promise<any> => {
  const form = await Form.findOne({ slug, status: "published" })
    .select("-settings.requireLogin -settings.collectIP")
    .lean();

  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found or not published");
  }

  return form;
};

export const getFormSchema = async (slug: string): Promise<any> => {
  const form = await Form.findOne({ slug, status: "published" }).lean();
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found or not published");
  }

  const fields = (form.fields || [])
    .filter((f: any) => f.isActive)
    .sort((a: any, b: any) => a.order - b.order)
    .map(({ logic, ...rest }: any) => rest);

  return {
    form: {
      id: form._id,
      title: form.title,
      description: form.description,
      settings: form.settings,
    },
    fields,
  };
};

export const getFormTheme = async (slug: string): Promise<any> => {
  const form = await Form.findOne({ slug, status: "published" })
    .select("theme title")
    .lean();

  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found or not published");
  }

  return form;
};

export const getFormPreview = async (slug: string): Promise<any> => {
  const form = await Form.findOne({ slug }).lean();
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  const fields = (form.fields || [])
    .filter((f: any) => f.isActive)
    .sort((a: any, b: any) => a.order - b.order);

  return { form, fields };
};

export const submitForm = async (
  slug: string,
  data: { answers: any[]; sessionId?: string },
  metadata?: any
): Promise<any> => {
  const form = await Form.findOne({ slug, status: "published" });
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found or not published");
  }

  const response = await FormResponse.create({
    formId: form._id,
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
    message: "Form submitted successfully",
  };
};

export const saveDraft = async (
  slug: string,
  data: { answers: any[]; sessionId?: string }
): Promise<any> => {
  const form = await Form.findOne({ slug, status: "published" });
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found or not published");
  }

  const response = await FormResponse.create({
    formId: form._id,
    answers: data.answers,
    sessionId: data.sessionId || `draft_${nanoid()}`,
    submittedAt: new Date(),
  });

  return {
    submissionId: response._id,
    sessionId: response.sessionId,
    message: "Draft saved successfully",
  };
};

export const getSubmitStatus = async (
  slug: string,
  submissionId: string
): Promise<any> => {
  const form = await Form.findOne({ slug }).lean();
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
    submittedAt: response.submittedAt,
    status: "completed",
  };
};