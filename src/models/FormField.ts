import mongoose, { Schema, Document } from "mongoose";
import { IForm } from "./Form";

export interface IFormField extends Document {
  formId: IForm["_id"];
  fieldKey: string;
  label: string;
  helperText: string;
  placeholder: string;
  type:
    | "shortText"
    | "longText"
    | "email"
    | "phone"
    | "number"
    | "date"
    | "time"
    | "radio"
    | "checkbox"
    | "select"
    | "multiSelect"
    | "file"
    | "rating"
    | "yesNo"
    | "url";
  required: boolean;
  order: number;
  options: { label?: string; value?: string }[];
  validation: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  logic: {
    whenFieldKey?: string;
    operator?: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan";
    value?: any;
    action?: "show" | "hide" | "goToField" | "goToEnd";
    targetFieldKey?: string;
  }[];
  appearance: {
    width: "full" | "half";
    icon: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const formFieldSchema = new Schema<IFormField>(
  {
    formId: { type: Schema.Types.ObjectId, ref: "Form", required: true, index: true },

    fieldKey: { type: String, required: true },
    label: { type: String, required: true },
    helperText: { type: String, default: "" },
    placeholder: { type: String, default: "" },

    type: {
      type: String,
      enum: [
        "shortText",
        "longText",
        "email",
        "phone",
        "number",
        "date",
        "time",
        "radio",
        "checkbox",
        "select",
        "multiSelect",
        "file",
        "rating",
        "yesNo",
        "url",
      ],
      required: true,
    },

    required: { type: Boolean, default: false },
    order: { type: Number, required: true },

    options: [
      {
        label: { type: String },
        value: { type: String },
      },
    ],

    validation: {
      minLength: { type: Number },
      maxLength: { type: Number },
      min: { type: Number },
      max: { type: Number },
      pattern: { type: String },
      message: { type: String },
    },

    logic: [
      {
        whenFieldKey: { type: String },
        operator: {
          type: String,
          enum: ["equals", "notEquals", "contains", "greaterThan", "lessThan"],
        },
        value: { type: Schema.Types.Mixed },
        action: {
          type: String,
          enum: ["show", "hide", "goToField", "goToEnd"],
        },
        targetFieldKey: { type: String },
      },
    ],

    appearance: {
      width: { type: String, enum: ["full", "half"], default: "full" },
      icon: { type: String, default: "" },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

formFieldSchema.index({ formId: 1, order: 1 });
formFieldSchema.index({ formId: 1, fieldKey: 1 }, { unique: true });

export const FormField = mongoose.model<IFormField>("FormField", formFieldSchema);