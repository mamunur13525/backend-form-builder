import mongoose, { Schema, Document, Model } from "mongoose";

interface IBlock extends Document {
  formId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const blockSchema = new Schema<IBlock>(
  {
    formId: { type: Schema.Types.ObjectId, ref: "Form", required: true, index: true },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    type: { type: String, default: "section" },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

blockSchema.index({ formId: 1, order: 1 });

const Block = mongoose.model<IBlock>("Block", blockSchema);

export const createBlock = async (data: {
  formId: string;
  title: string;
  description: string;
  type: string;
  order: number;
}): Promise<IBlock> => {
  return Block.create(data);
};

export const findBlocksByFormId = async (formId: string): Promise<IBlock[]> => {
  return Block.find({ formId }).sort({ order: 1 }).lean();
};

export const findBlockById = async (formId: string, blockId: string): Promise<IBlock | null> => {
  return Block.findOne({ _id: blockId, formId });
};

export const updateBlock = async (blockId: string, data: Record<string, any>): Promise<IBlock | null> => {
  return Block.findByIdAndUpdate(blockId, data, { new: true });
};

export const deleteBlock = async (blockId: string): Promise<IBlock | null> => {
  return Block.findByIdAndDelete(blockId);
};

export const getMaxOrder = async (formId: string): Promise<number> => {
  const lastBlock = await Block.findOne({ formId }).sort({ order: -1 }).select("order");
  return lastBlock ? lastBlock.order : 0;
};

export const updateBlockOrders = async (updates: { blockId: string; order: number }[]): Promise<void> => {
  const operations = updates.map((u) => ({
    updateOne: {
      filter: { _id: u.blockId },
      update: { $set: { order: u.order } },
    },
  }));
  await Block.bulkWrite(operations);
};