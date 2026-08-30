import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { Form, normalizeFormSettings } from "../../models/Form";
import { validateExpressionSyntax, ExpressionError } from "../../utils/form-logic/calculate";
import * as logicRepo from "./logic.repository";
import {
  CreateLogicBody,
  LogicActionBody,
  LogicConditionBody,
  ReplaceAllLogicBody,
  UpdateLogicBody,
} from "./logic.types";

/** Collect every reference a rule body makes, so we can validate them all. */
const validateReferences = (
  form: any,
  conditions: LogicConditionBody[],
  actions: LogicActionBody[]
): void => {
  const pageKeys = new Set(
    (form.pages ?? [])
      .filter((p: any) => p && p.pageKey)
      .map((p: any) => p.pageKey as string)
  );
  const variableNames = new Set(
    (normalizeFormSettings(form.settings).variables ?? []).map((v) => v.name)
  );

  for (const condition of conditions) {
    if (condition.sourceType === "variable") {
      if (!variableNames.has(condition.sourceKey)) {
        throw new ApiError(
          httpStatus.UNPROCESSABLE_ENTITY,
          `Unknown variable "${condition.sourceKey}" in condition`
        );
      }
    } else if (!pageKeys.has(condition.sourceKey)) {
      throw new ApiError(
        httpStatus.UNPROCESSABLE_ENTITY,
        `Unknown page "${condition.sourceKey}" in condition`
      );
    }
  }

  for (const action of actions) {
    if (["showPage", "hidePage", "jumpToPage"].includes(action.action)) {
      if (!action.targetPageKey || !pageKeys.has(action.targetPageKey)) {
        throw new ApiError(
          httpStatus.UNPROCESSABLE_ENTITY,
          `Unknown target page "${action.targetPageKey ?? ""}" in action`
        );
      }
    }

    if (action.action === "setVariable") {
      const variable = (
        normalizeFormSettings(form.settings).variables ?? []
      ).find((v) => v.name === action.variableName);
      if (!variable) {
        throw new ApiError(
          httpStatus.UNPROCESSABLE_ENTITY,
          `Unknown variable "${action.variableName ?? ""}" in action`
        );
      }
      if (variable.type !== "number") {
        throw new ApiError(
          httpStatus.UNPROCESSABLE_ENTITY,
          `Calculation variable "${variable.name}" must be of type number`
        );
      }
    }

    if (typeof action.expression === "string" && action.expression.trim() !== "") {
      try {
        validateExpressionSyntax(action.expression);
      } catch (error) {
        const message =
          error instanceof ExpressionError
            ? error.message
            : "Invalid calculation expression";
        throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, message);
      }
      // Every referenced name must be a known page or variable.
      const references = action.expression.match(/@([A-Za-z0-9_]+)/g) ?? [];
      for (const reference of references) {
        const name = reference.slice(1);
        if (!pageKeys.has(name) && !variableNames.has(name)) {
          throw new ApiError(
            httpStatus.UNPROCESSABLE_ENTITY,
            `Unknown reference "@${name}" in expression`
          );
        }
      }
    }
  }
};
/** Map a raw Mongoose logic document to the client-facing shape (`_id` → `id`). */
const toClient = (doc: any): any => {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, ...rest } = obj;
  // Prefer an `id` already set by the repository layer; fall back to `_id`.
  return { ...rest, id: rest.id ?? (_id ? String(_id) : undefined) };
};

/** Map an array of raw Mongoose logic documents to client shape. */
const toClientArray = (docs: any[]): any[] => docs.map(toClient);


export const createLogic = async (formId: string, data: CreateLogicBody): Promise<any> => {
  const form = await Form.findById(formId);
  if (!form) throw new ApiError(httpStatus.NOT_FOUND, "Form not found");

  const conditions = data.conditions ?? [];
  const actions = data.actions ?? [];
  validateReferences(form, conditions, actions);

  const order = data.order ?? (await logicRepo.getMaxOrder(formId)) + 1;
  const logic = await logicRepo.createLogic({
    formId,
    category: data.category ?? "display",
    name: data.name ?? "",
    enabled: data.enabled ?? true,
    combinator: data.combinator ?? "and",
    conditions,
    actions,
    order,
  });
    return toClient(logic);
};

export const getLogicsByFormId = async (formId: string): Promise<any[]> => {
  const docs = await logicRepo.findLogicsByFormId(formId);
  return toClientArray(docs);
};

export const updateLogic = async (
  formId: string,
  logicId: string,
  data: UpdateLogicBody
): Promise<any> => {
  const logic = await logicRepo.findLogicById(formId, logicId);
  if (!logic) throw new ApiError(httpStatus.NOT_FOUND, "Logic not found");

  const form = await Form.findById(formId);
  if (!form) throw new ApiError(httpStatus.NOT_FOUND, "Form not found");

  // Validate the merged rule (existing values fill in whatever is absent).
  const existing = logic.toObject() as any;
  const conditions = data.conditions ?? existing.conditions ?? [];
  const actions = data.actions ?? existing.actions ?? [];
  validateReferences(form, conditions, actions);

  const updated = await logicRepo.updateLogic(logicId, {
    ...(data.category !== undefined ? { category: data.category } : {}),
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
    ...(data.combinator !== undefined ? { combinator: data.combinator } : {}),
    ...(data.conditions !== undefined ? { conditions: data.conditions } : {}),
    ...(data.actions !== undefined ? { actions: data.actions } : {}),
    ...(data.order !== undefined ? { order: data.order } : {}),
  });
    return toClient(updated);
};

export const deleteLogic = async (formId: string, logicId: string): Promise<void> => {
  const logic = await logicRepo.findLogicById(formId, logicId);
  if (!logic) throw new ApiError(httpStatus.NOT_FOUND, "Logic not found");
  await logicRepo.deleteLogic(logicId);
};

/**
 * Replaces every logic rule of the form in one request — the endpoint the
 * Logic Builder uses when the user hits "Save". Every rule is validated
 * against the form's pages/variables before anything is persisted.
 */
export const replaceAllLogic = async (
  formId: string,
  data: ReplaceAllLogicBody
): Promise<any[]> => {
  const form = await Form.findById(formId);
  if (!form) throw new ApiError(httpStatus.NOT_FOUND, "Form not found");

  const rules = data.rules ?? [];
  for (const rule of rules) {
    validateReferences(form, rule.conditions ?? [], rule.actions ?? []);
  }

    const result = await logicRepo.replaceAllLogics(formId, rules);

  if (form.publishedVersionId) {
    form.hasUnpublishedChanges = true;
    await form.save();
  }

  return toClientArray(result);
};
