import mongoose, { Schema, Document } from "mongoose";

interface IFormLogic extends Document {
  formId: mongoose.Types.ObjectId;
  conditions: {
    pageKey: string;
    operator: string;
    value: any;
  }[];
  actions: {
    action: string;
    target?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const formLogicSchema = new Schema<IFormLogic>(
  {
    formId: { type: Schema.Types.ObjectId, ref: "Form", required: true, index: true },
    conditions: [
      {
        pageKey: { type: String, required: true },
        operator: { type: String, required: true },
        value: { type: Schema.Types.Mixed },
      },
    ],
    actions: [
      {
        action: { type: String, required: true },
        target: { type: String },
      },
    ],
  },
  { timestamps: true }
);

const FormLogic = mongoose.model<IFormLogic>("FormLogic", formLogicSchema);

export const createLogic = async (data: {
  formId: string;
  conditions: any[];
  actions: any[];
}): Promise<IFormLogic> => {
  return FormLogic.create(data);
};

export const findLogicsByFormId = async (formId: string): Promise<IFormLogic[]> => {
  return FormLogic.find({ formId }).lean();
};

export const findLogicById = async (formId: string, logicId: string): Promise<IFormLogic | null> => {
  return FormLogic.findOne({ _id: logicId, formId });
};

export const updateLogic = async (logicId: string, data: Record<string, any>): Promise<IFormLogic | null> => {
  return FormLogic.findByIdAndUpdate(logicId, data, { new: true });
};

export const deleteLogic = async (logicId: string): Promise<IFormLogic | null> => {
  return FormLogic.findByIdAndDelete(logicId);
};