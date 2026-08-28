import mongoose, { Schema, Document } from "mongoose";

export const FEEDBACK_STATUSES = [
  "pending",
  "reviewing",
  "planned",
  "in_progress",
  "completed",
  "closed",
] as const;

export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export interface IFeedback extends Document {
  slug: string;
  title: string;
  description?: string;
  /** Optional ImageKit URL for an image attached to the submission. */
  imageUrl?: string;
  status: FeedbackStatus;
  boardId: string;
  author: mongoose.Types.ObjectId;
  /** Users who have upvoted — length drives `upvoteCount`. */
  upvotedBy: mongoose.Types.ObjectId[];
  upvoteCount: number;
  commentCount: number;
  /** Distinct recent commenters, surfaced as an avatar stack on cards. */
  commenterIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    imageUrl: { type: String },
    status: {
      type: String,
      enum: FEEDBACK_STATUSES,
      default: "pending",
      index: true,
    },
    boardId: { type: String, required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    upvotedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    upvoteCount: { type: Number, default: 0, index: true },
    commentCount: { type: Number, default: 0 },
    commenterIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// Text-ish search on title/description handled with a regex in the repository,
// so a lightweight compound index on the common sort fields is enough here.
feedbackSchema.index({ boardId: 1, createdAt: -1 });

export const Feedback = mongoose.model<IFeedback>("Feedback", feedbackSchema);
