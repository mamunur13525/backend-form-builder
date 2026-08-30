import mongoose, { Schema, Document } from "mongoose";
import {
  logicActionTypes,
  logicCategories,
  logicCombinators,
  logicOperators,
  logicSourceTypes,
} from "../../constants/pageTypes";

export interface IFormLogicCondition {
  sourceType: (typeof logicSourceTypes)[number];
  sourceKey: string;
  operator: (typeof logicOperators)[number];
  value?: any;
  combinator?: (typeof logicCombinators)[number];
}

export interface IFormLogicAction {
  action: (typeof logicActionTypes)[number];
  targetPageKey?: string;
  variableName?: string;
  expression?: string;
  value?: any;
}

export interface IFormLogic extends Document {
  formId: mongoose.Types.ObjectId;
  category: (typeof logicCategories)[number];
  name: string;
  enabled: boolean;
  combinator: (typeof logicCombinators)[number];
  conditions: IFormLogicCondition[];
  actions: IFormLogicAction[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Form-level logic rules edited from the Logic Builder. Each rule combines
 * multiple conditions (AND/OR) over page answers or variables and triggers
 * actions: showing/hiding pages, branching (jump) or setting calculation
 * variables.
 */
const formLogicSchema = new Schema<IFormLogic>(
  {
    formId: {
      type: Schema.Types.ObjectId,
      ref: "Form",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: logicCategories,
      default: "display",
    },
    name: { type: String, default: "" },
    enabled: { type: Boolean, default: true },
    combinator: { type: String, enum: logicCombinators, default: "and" },
    conditions: [
      {
        _id: false,
        sourceType: {
          type: String,
          enum: logicSourceTypes,
          default: "page",
        },
        sourceKey: { type: String, required: true },
        operator: {
          type: String,
          enum: logicOperators,
          required: true,
        },
        value: { type: Schema.Types.Mixed },
        // Joins to the previous condition; first condition leaves it unset.
        combinator: { type: String, enum: logicCombinators },
      },
    ],
    actions: [
      {
        _id: false,
        action: {
          type: String,
          enum: logicActionTypes,
          required: true,
        },
        targetPageKey: { type: String },
        variableName: { type: String },
        expression: { type: String },
        value: { type: Schema.Types.Mixed },
      },
    ],
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const FormLogic = mongoose.model<IFormLogic>("FormLogic", formLogicSchema);

export const createLogic = async (data: {
  formId: string;
  category?: (typeof logicCategories)[number];
  name?: string;
  enabled?: boolean;
  combinator?: (typeof logicCombinators)[number];
  conditions: any[];
  actions: any[];
  order?: number;
}): Promise<IFormLogic> => {
  return FormLogic.create(data);
};

export const findLogicsByFormId = async (
  formId: string
): Promise<IFormLogic[]> => {
  const docs = await FormLogic.find({ formId })
    .sort({ order: 1, createdAt: 1 })
    .lean();
  return docs.map((doc: any) => {
    const { _id, ...rest } = doc;
    return { ...rest, id: _id ? String(_id) : undefined };
  });
};

export const findLogicById = async (
  formId: string,
  logicId: string
): Promise<IFormLogic | null> => {
  return FormLogic.findOne({ _id: logicId, formId });
};

export const updateLogic = async (
  logicId: string,
  data: Record<string, any>
): Promise<IFormLogic | null> => {
  return FormLogic.findByIdAndUpdate(logicId, data, { new: true });
};

export const deleteLogic = async (
  logicId: string
): Promise<IFormLogic | null> => {
  return FormLogic.findByIdAndDelete(logicId);
};

export const getMaxOrder = async (formId: string): Promise<number> => {
  const last = await FormLogic.findOne({ formId })
    .sort({ order: -1 })
    .select("order")
    .lean();
  return last?.order ?? 0;
};

/**
 * Replaces every logic rule of a form in one go (used by the Logic Builder's
 * "Save changes", which commits all sections at once). Existing rules keep
 * their `_id` when they are still present; new ones are created and removed
 * ones are deleted, so the frontend's rule ids stay stable across saves.
 */
export const replaceAllLogics = async (
  formId: string,
  rules: any[]
): Promise<any[]> => {
  const existing = await FormLogic.find({ formId }).lean();
  const existingIds = new Set(existing.map((r) => r._id.toString()));
  const incoming = rules.map((rule, index) => ({ rule, index }));
  const keptIds: string[] = [];

  for (const { rule, index } of incoming) {
    const id = rule?._id?.toString();
    if (id && existingIds.has(id)) {
      await FormLogic.findByIdAndUpdate(id, {
        ...rule,
        formId,
        order: index + 1,
      });
      keptIds.push(id);
    }
  }

  await FormLogic.deleteMany({
    formId,
    _id: {
      $nin: keptIds.map((id) => new mongoose.Types.ObjectId(id)),
    },
  });

  for (const { rule, index } of incoming) {
    const id = rule?._id?.toString();
    if (id && existingIds.has(id)) continue; // updated above
    await FormLogic.create({ ...rule, formId, order: index + 1 });
  }

    const final = await FormLogic.find({ formId }).sort({ order: 1, createdAt: 1 }).lean();
  return final.map((doc: any) => {
    const { _id, ...rest } = doc;
    return { ...rest, id: _id ? String(_id) : undefined };
  });
};

export { FormLogic };
export type { IFormLogic as IFormLogicDocument };
