import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { nanoid } from "nanoid";
import mongoose from "mongoose";
import { Form } from "../../models/Form";
import { FormVersion } from "../../models/FormVersion";
import { FormResponse } from "../../models/FormResponse";

const buildPublicFormQuery = (slugOrId: string) => {
  const query: any = { status: "published" };
  if (mongoose.Types.ObjectId.isValid(slugOrId)) {
    query.$or = [{ slug: slugOrId }, { _id: slugOrId }];
  } else {
    query.slug = slugOrId;
  }
  return query;
};

export const getPublicForm = async (slugOrId: string): Promise<any> => {
  const form = await Form.findOne(buildPublicFormQuery(slugOrId)).lean();
  if (!form || !form.publishedVersionId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found or not published");
  }

  const version = await FormVersion.findById(form.publishedVersionId).lean();
  if (!version) {
    throw new ApiError(httpStatus.NOT_FOUND, "Published form version not found");
  }

  return {
    id: form._id,
    title: form.title,
    slug: form.slug,
    status: form.status,
    formVersionId: version._id,
    version: version.version,
    fields: version.formSchema.fields,
    theme: version.formSchema.theme,
    settings: {
      oneQuestionAtATime: version.formSchema.settings?.oneQuestionAtATime,
      showProgressBar: version.formSchema.settings?.showProgressBar,
      allowMultipleSubmissions: version.formSchema.settings?.allowMultipleSubmissions,
    },
    createdBy: form.createdBy,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  };
};

export const getFormSchema = async (slugOrId: string): Promise<any> => {
  const form = await Form.findOne(buildPublicFormQuery(slugOrId)).lean();
  if (!form || !form.publishedVersionId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found or not published");
  }

  const version = await FormVersion.findById(form.publishedVersionId).lean();
  if (!version) {
    throw new ApiError(httpStatus.NOT_FOUND, "Published form version not found");
  }

  const fields = (version.formSchema.fields || [])
    .filter((f: any) => f.isActive)
    .sort((a: any, b: any) => a.order - b.order)
    .map(({ logic, ...rest }: any) => rest);

  return {
    form: {
      id: form._id,
      title: form.title,
      version: version.version,
      formVersionId: version._id,
      settings: version.formSchema.settings,
    },
    fields,
  };
};

export const getFormTheme = async (slugOrId: string): Promise<any> => {
  const form = await Form.findOne(buildPublicFormQuery(slugOrId)).lean();
  if (!form || !form.publishedVersionId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found or not published");
  }

  const version = await FormVersion.findById(form.publishedVersionId).lean();
  if (!version) {
    throw new ApiError(httpStatus.NOT_FOUND, "Published form version not found");
  }

  return {
    title: form.title,
    theme: version.formSchema.theme,
  };
};

export const getFormPreview = async (slugOrId: string): Promise<any> => {
  let query: any = {};
  if (mongoose.Types.ObjectId.isValid(slugOrId)) {
    query.$or = [{ slug: slugOrId }, { _id: slugOrId }];
  } else {
    query.slug = slugOrId;
  }

  const form = await Form.findOne(query).lean();
  if (!form) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found");
  }

  let versionId = form.publishedVersionId || form.draftVersionId;
  let fields: any[] = [];
  let theme = form.theme;
  let settings = form.settings;

  if (versionId) {
    const version = await FormVersion.findById(versionId).lean();
    if (version) {
      fields = (version.formSchema.fields || [])
        .filter((f: any) => f.isActive)
        .sort((a: any, b: any) => a.order - b.order);
      theme = version.formSchema.theme;
      settings = version.formSchema.settings;
    }
  }

  return {
    form: {
      ...form,
      theme,
      settings,
    },
    fields,
  };
};

export const submitForm = async (
  slugOrId: string,
  data: { answers: any[]; sessionId?: string },
  metadata?: any
): Promise<any> => {
  const form = await Form.findOne(buildPublicFormQuery(slugOrId));
  if (!form || !form.publishedVersionId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found or not published");
  }

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
  const form = await Form.findOne(buildPublicFormQuery(slugOrId));
  if (!form || !form.publishedVersionId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Form not found or not published");
  }

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

export const getSubmitStatus = async (
  slugOrId: string,
  submissionId: string
): Promise<any> => {
  let query: any = {};
  if (mongoose.Types.ObjectId.isValid(slugOrId)) {
    query.$or = [{ slug: slugOrId }, { _id: slugOrId }];
  } else {
    query.slug = slugOrId;
  }

  const form = await Form.findOne(query).lean();
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