import { Form, IForm } from "../../models/Form";
import { FormShare, IFormShare } from "../../models/FormShare";

export const createForm = async (data: {
  title: string;
  slug: string;
  createdBy: string;
}): Promise<IForm> => {
  return Form.create(data);
};

export const findAllForms = async (
  skip: number,
  limit: number,
  sort: Record<string, 1 | -1>,
  filter: Record<string, any> = {}
): Promise<IForm[]> => {
  return Form.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate("createdBy", "name email");
};

export const countForms = async (filter: Record<string, any> = {}): Promise<number> => {
  return Form.countDocuments(filter);
};

export const findFormById = async (formId: string): Promise<IForm | null> => {
  return Form.findById(formId).populate("createdBy", "name email");
};

export const findFormBySlug = async (slug: string): Promise<IForm | null> => {
  return Form.findOne({ slug });
};

export const checkSlugExists = async (slug: string): Promise<boolean> => {
  const form = await Form.findOne({ slug });
  return !!form;
};

/** All form ids owned by a user — used by billing for response-limit checks. */
export const findFormIdsByOwner = async (userId: string): Promise<string[]> => {
  const ids = await Form.find({ createdBy: userId }).distinct("_id");
  return ids.map((id) => String(id));
};

export const checkTitleExists = async (title: string, excludeFormId?: string): Promise<boolean> => {
  const query: Record<string, any> = { title };
  if (excludeFormId) {
    query._id = { $ne: excludeFormId };
  }
  const form = await Form.findOne(query);
  return !!form;
};

export const updateForm = async (
  formId: string,
  data: Record<string, any>
): Promise<IForm | null> => {
  return Form.findByIdAndUpdate(formId, data, { new: true }).populate("createdBy", "name email");
};

export const deleteForm = async (formId: string): Promise<IForm | null> => {
  return Form.findByIdAndDelete(formId);
};

// Form Share
export const findFormShare = async (formId: string): Promise<IFormShare | null> => {
  return FormShare.findOne({ formId });
};

export const upsertFormShare = async (
  formId: string,
  data: Record<string, any>
): Promise<IFormShare> => {
  return FormShare.findOneAndUpdate(
    { formId },
    { formId, ...data },
    { upsert: true, new: true }
  );
};