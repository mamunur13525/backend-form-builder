import { FormResponse, IFormResponse } from "../../models/FormResponse";

export const findResponsesByFormId = async (
  formId: string,
  skip: number,
  limit: number,
  sort: Record<string, 1 | -1>,
  filter: Record<string, any> = {}
): Promise<IFormResponse[]> => {
  return FormResponse.find({ formId, ...filter })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();
};

export const countResponses = async (
  formId: string,
  filter: Record<string, any> = {}
): Promise<number> => {
  return FormResponse.countDocuments({ formId, ...filter });
};

export const findResponseById = async (
  formId: string,
  responseId: string
): Promise<IFormResponse | null> => {
  return FormResponse.findOne({ _id: responseId, formId }).lean();
};

export const updateResponse = async (
  responseId: string,
  data: Record<string, any>
): Promise<IFormResponse | null> => {
  return FormResponse.findByIdAndUpdate(responseId, data, { new: true }).lean();
};

export const deleteResponse = async (responseId: string): Promise<IFormResponse | null> => {
  return FormResponse.findByIdAndDelete(responseId);
};

export const getResponseStats = async (formId: string): Promise<any> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [total, todayResponses, uniqueRespondents] = await Promise.all([
    FormResponse.countDocuments({ formId }),
    FormResponse.countDocuments({ formId, submittedAt: { $gte: today } }),
    FormResponse.distinct("respondentId", { formId, respondentId: { $ne: null } }),
  ]);

  return { total, todayResponses, uniqueRespondents: uniqueRespondents.length };
};

/**
 * Responses submitted across a set of forms since a date — used by billing
 * for monthly plan-limit checks.
 */
export const countResponsesSince = async (
  formIds: string[],
  since: Date
): Promise<number> => {
  if (formIds.length === 0) return 0;
  return FormResponse.countDocuments({
    formId: { $in: formIds },
    submittedAt: { $gte: since },
  });
};