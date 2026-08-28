import mongoose, { Schema, Document } from "mongoose";

export const UPDATE_COVERS = ["mcp", "sheets", "integrations"] as const;
export type UpdateCover = (typeof UPDATE_COVERS)[number];

/** Inline run inside an update paragraph — supports bold, links and code chips. */
export interface ITextRun {
  text: string;
  bold?: boolean;
  link?: string;
  code?: boolean;
}

export type IUpdateBlock =
  | { type: "paragraph"; runs: ITextRun[] }
  | { type: "readmore"; url: string; label: string };

export interface IUpdate extends Document {
  slug: string;
  title: string;
  date: Date;
  tags: string[];
  cover?: UpdateCover;
  excerpt: string;
  author?: mongoose.Types.ObjectId;
  content: IUpdateBlock[];
  createdAt: Date;
  updatedAt: Date;
}

const updateSchema = new Schema<IUpdate>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true, index: true },
    tags: { type: [String], default: [] },
    cover: { type: String, enum: UPDATE_COVERS, required: false },
    excerpt: { type: String, default: "" },
    author: { type: Schema.Types.ObjectId, ref: "User", required: false },
    // Rich-text blocks are stored verbatim; shape is validated at the edge (Zod).
    // Cast needed because Mongoose can't reconcile a [Mixed] array with the
    // typed IUpdateBlock[] union on the document interface.
    content: { type: [Schema.Types.Mixed], default: [] } as any,
  },
  { timestamps: true }
);

export const Update = mongoose.model<IUpdate>("Update", updateSchema);
