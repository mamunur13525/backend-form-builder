import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./User";

export interface IFormField {
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

export interface IForm extends Document {
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  theme: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
  };
  settings: {
    oneQuestionAtATime: boolean;
    showProgressBar: boolean;
    allowMultipleSubmissions: boolean;
    requireLogin: boolean;
    collectIP: boolean;
  };
  fields: IFormField[];
  createdBy: IUser["_id"];
  updatedBy?: IUser["_id"];
  createdAt: Date;
  updatedAt: Date;
}

const formFieldSchema = new Schema<IFormField>(
  {
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

const formSchema = new Schema<IForm>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },

    theme: {
      primaryColor: { type: String, default: "#000000" },
      backgroundColor: { type: String, default: "#ffffff" },
      textColor: { type: String, default: "#111111" },
    },

    settings: {
      oneQuestionAtATime: { type: Boolean, default: true },
      showProgressBar: { type: Boolean, default: true },
      allowMultipleSubmissions: { type: Boolean, default: true },
      requireLogin: { type: Boolean, default: false },
      collectIP: { type: Boolean, default: false },
    },

    fields: [formFieldSchema],

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Form = mongoose.model<IForm>("Form", formSchema);