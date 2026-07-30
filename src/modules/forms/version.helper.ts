import mongoose from "mongoose";
import { Form, IForm } from "../../models/Form";
import { FormVersion, IFormVersion } from "../../models/FormVersion";

export const createInitialVersion = async (
  formId: mongoose.Types.ObjectId | string,
  createdBy: string,
  initialData?: {
    fields?: any[];
    settings?: any;
    theme?: any;
  }
): Promise<IFormVersion> => {
  const version = await FormVersion.create({
    formId,
    version: 1,
    formSchema: {
      fields: initialData?.fields || [],
      settings: initialData?.settings || {
        oneQuestionAtATime: true,
        showProgressBar: true,
        allowMultipleSubmissions: true,
        requireLogin: false,
        collectIP: false,
      },
      theme: initialData?.theme || {
        primaryColor: "#000000",
        backgroundColor: "#ffffff",
        textColor: "#111111",
      },
    },
    createdBy,
  });
  return version;
};

export const ensureDraftVersion = async (
  form: IForm,
  userId?: string
): Promise<IFormVersion> => {
  // If form has no draftVersionId at all, create V1
  if (!form.draftVersionId) {
    const v1 = await createInitialVersion(
      form._id as mongoose.Types.ObjectId,
      userId || form.createdBy.toString(),
      { fields: form.fields, settings: form.settings, theme: form.theme }
    );
    form.draftVersionId = v1._id as mongoose.Types.ObjectId;
    if (form.status === "published" && !form.publishedVersionId) {
      form.publishedVersionId = v1._id as mongoose.Types.ObjectId;
    }
    await form.save();
    return v1;
  }

  // If publishedVersionId exists AND draftVersionId equals publishedVersionId,
  // we MUST clone the published version into a new draft version.
  if (
    form.publishedVersionId &&
    form.draftVersionId.toString() === form.publishedVersionId.toString()
  ) {
    const publishedVersion = await FormVersion.findById(form.publishedVersionId);
    if (!publishedVersion) {
      throw new Error("Published version document not found");
    }

    const lastVersionDoc = await FormVersion.findOne({ formId: form._id })
      .sort({ version: -1 })
      .lean();
    const nextVersionNum = (lastVersionDoc?.version || 1) + 1;

    const clonedSchema = JSON.parse(JSON.stringify(publishedVersion.formSchema));

    const newDraftVersion = await FormVersion.create({
      formId: form._id,
      version: nextVersionNum,
      formSchema: clonedSchema,
      createdBy: userId || form.createdBy,
    });

    form.draftVersionId = newDraftVersion._id as mongoose.Types.ObjectId;
    form.hasUnpublishedChanges = true;
    await form.save();

    return newDraftVersion;
  }

  // Return existing draft version document
  const draftVersion = await FormVersion.findById(form.draftVersionId);
  if (!draftVersion) {
    const v = await createInitialVersion(
      form._id as mongoose.Types.ObjectId,
      userId || form.createdBy.toString(),
      { fields: form.fields, settings: form.settings, theme: form.theme }
    );
    form.draftVersionId = v._id as mongoose.Types.ObjectId;
    await form.save();
    return v;
  }

  if (form.publishedVersionId && form.draftVersionId.toString() !== form.publishedVersionId.toString()) {
    form.hasUnpublishedChanges = true;
    await form.save();
  }

  return draftVersion;
};
