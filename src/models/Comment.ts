import mongoose, { Schema, Document } from "mongoose";

export interface IFeedbackComment extends Document {
  postId: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  body: string;
  /** Optional trailing link rendered inside the comment body. */
  link?: { url: string; label: string };
  pinned: boolean;
  /** Plain reaction counters (each click increments; no per-user state). */
  likeCount: number;
  dislikeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackCommentSchema = new Schema<IFeedbackComment>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Feedback",
      required: true,
      index: true,
    },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true },
    link: {
      type: {
        url: { type: String, required: true },
        label: { type: String, required: true },
      },
      required: false,
      _id: false,
    },
    pinned: { type: Boolean, default: false },
    likeCount: { type: Number, default: 0 },
    dislikeCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const FeedbackComment = mongoose.model<IFeedbackComment>(
  "FeedbackComment",
  feedbackCommentSchema
);
