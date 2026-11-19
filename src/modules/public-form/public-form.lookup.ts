import mongoose from "mongoose";
import { Form } from "../../models/Form";
import { FormVersion } from "../../models/FormVersion";
import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import {
  ClosedFormStatus,
  closedFormReason,
  formStatus,
  isClosedFormStatus,
} from "../../constants/status";

export const buildFormLookupQuery = (slugOrId: string) => {
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

export const findPublicForm = async (slugOrId: string) => {
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

export const findPublicFormWithVersion = async (slugOrId: string) => {
  const form = await findPublicForm(slugOrId);

  const version = await FormVersion.findById(form.publishedVersionId).lean();
  if (!version) {
    throw new ApiError(httpStatus.NOT_FOUND, "Published form version not found");
  }

  return { form, version };
};
