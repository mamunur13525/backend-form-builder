import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import * as logicRepo from "./logic.repository";
import { CreateLogicBody, UpdateLogicBody } from "./logic.types";

export const createLogic = async (formId: string, data: CreateLogicBody): Promise<any> => {
  const logic = await logicRepo.createLogic({
    formId,
    conditions: data.conditions,
    actions: data.actions,
  });
  return logic.toObject();
};

export const getLogicsByFormId = async (formId: string): Promise<any[]> => {
  return logicRepo.findLogicsByFormId(formId);
};

export const updateLogic = async (formId: string, logicId: string, data: UpdateLogicBody): Promise<any> => {
  const logic = await logicRepo.findLogicById(formId, logicId);
  if (!logic) throw new ApiError(httpStatus.NOT_FOUND, "Logic not found");
  const updated = await logicRepo.updateLogic(logicId, data);
  return updated!.toObject();
};

export const deleteLogic = async (formId: string, logicId: string): Promise<void> => {
  const logic = await logicRepo.findLogicById(formId, logicId);
  if (!logic) throw new ApiError(httpStatus.NOT_FOUND, "Logic not found");
  await logicRepo.deleteLogic(logicId);
};