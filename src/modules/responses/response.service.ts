import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { getPaginationMeta } from "../../utils/pagination";
import * as responseRepo from "./response.repository";
import { UpdateResponseBody } from "./response.types";

export const getResponsesByFormId = async (
  formId: string,
  skip: number,
  limit: number,
  sort: Record<string, 1 | -1>,
  filter: Record<string, any> = {}
) => {
  const [responses, total] = await Promise.all([
    responseRepo.findResponsesByFormId(formId, skip, limit, sort, filter),
    responseRepo.countResponses(formId, filter),
  ]);

  return {
    responses,
    meta: getPaginationMeta(total, Math.floor(skip / limit) + 1, limit),
  };
};

export const getResponseById = async (formId: string, responseId: string): Promise<any> => {
  const response = await responseRepo.findResponseById(formId, responseId);
  if (!response) throw new ApiError(httpStatus.NOT_FOUND, "Response not found");
  return response;
};

export const updateResponse = async (
  formId: string,
  responseId: string,
  data: UpdateResponseBody
): Promise<any> => {
  const response = await responseRepo.findResponseById(formId, responseId);
  if (!response) throw new ApiError(httpStatus.NOT_FOUND, "Response not found");
  return responseRepo.updateResponse(responseId, data);
};

export const deleteResponse = async (formId: string, responseId: string): Promise<void> => {
  const response = await responseRepo.findResponseById(formId, responseId);
  if (!response) throw new ApiError(httpStatus.NOT_FOUND, "Response not found");
  await responseRepo.deleteResponse(responseId);
};

export const exportResponses = async (formId: string, format: string = "json"): Promise<any> => {
  const responses = await responseRepo.findResponsesByFormId(
    formId,
    0,
    10000,
    { submittedAt: -1 }
  );

  if (format === "csv") {
    // For CSV, flatten the answers
    const headers = ["submittedAt", "sessionId", ...new Set(responses.flatMap(r => r.answers.map(a => a.fieldKey)))];
    const rows = responses.map(r => {
      const row: Record<string, any> = { submittedAt: r.submittedAt, sessionId: r.sessionId };
      r.answers.forEach(a => { row[a.fieldKey] = a.value; });
      return row;
    });
    return { headers, rows };
  }

  return responses;
};

export const getResponseStats = async (formId: string): Promise<any> => {
  return responseRepo.getResponseStats(formId);
};

export const getResponseSummary = async (formId: string): Promise<any> => {
  const responses = await responseRepo.findResponsesByFormId(
    formId,
    0,
    10000,
    { submittedAt: -1 }
  );

  // Group answers by fieldKey
  const fieldSummaries: Record<string, { label: string; type: string; values: any[]; count: number }> = {};

  responses.forEach((r) => {
    r.answers.forEach((a) => {
      if (!fieldSummaries[a.fieldKey]) {
        fieldSummaries[a.fieldKey] = {
          label: a.label,
          type: a.type,
          values: [],
          count: 0,
        };
      }
      fieldSummaries[a.fieldKey].values.push(a.value);
      fieldSummaries[a.fieldKey].count++;
    });
  });

  return { totalResponses: responses.length, fields: fieldSummaries };
};

export const markAsRead = async (formId: string, responseId: string): Promise<any> => {
  return responseRepo.updateResponse(responseId, { "metadata.read": true });
};

export const markAsUnread = async (formId: string, responseId: string): Promise<any> => {
  return responseRepo.updateResponse(responseId, { "metadata.read": false });
};

export const starResponse = async (formId: string, responseId: string): Promise<any> => {
  return responseRepo.updateResponse(responseId, { "metadata.starred": true });
};

export const unstarResponse = async (formId: string, responseId: string): Promise<any> => {
  return responseRepo.updateResponse(responseId, { "metadata.starred": false });
};