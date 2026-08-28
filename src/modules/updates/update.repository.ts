import { Update, IUpdate } from "../../models/Update";

const AUTHOR_FIELDS = "name role avatarUrl";

export const findAll = async (): Promise<any[]> => {
  return Update.find()
    .sort({ date: -1 })
    .populate("author", AUTHOR_FIELDS)
    .lean();
};

export const findBySlug = async (slug: string): Promise<any | null> => {
  return Update.findOne({ slug }).populate("author", AUTHOR_FIELDS).lean();
};

export const findById = async (id: string): Promise<any | null> => {
  return Update.findById(id).populate("author", AUTHOR_FIELDS).lean();
};

export const slugExists = async (slug: string): Promise<boolean> => {
  return (await Update.countDocuments({ slug })) > 0;
};

export const create = async (data: Partial<IUpdate>): Promise<any> => {
  const created = await Update.create(data);
  return Update.findById(created._id).populate("author", AUTHOR_FIELDS).lean();
};

export const updateById = async (
  id: string,
  data: Record<string, unknown>
): Promise<any | null> => {
  return Update.findByIdAndUpdate(id, data, { new: true })
    .populate("author", AUTHOR_FIELDS)
    .lean();
};

export const deleteById = async (id: string): Promise<IUpdate | null> => {
  return Update.findByIdAndDelete(id);
};

/** Update `date` values on/after `since`, used to build the activity heatmap. */
export const findDatesSince = async (since: Date): Promise<Date[]> => {
  const docs = await Update.find({ date: { $gte: since } })
    .select("date")
    .lean();
  return docs.map((d) => new Date(d.date));
};
