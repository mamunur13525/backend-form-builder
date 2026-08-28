import { serializeAuthor, UserLike } from "../../utils/author";
import { UpdateEntryDTO } from "./update.types";
import { IUpdateBlock, UpdateCover } from "../../models/Update";

/** An update document (lean) with `author` optionally populated. */
export interface UpdateLike {
  _id: unknown;
  slug: string;
  title: string;
  date: Date;
  tags?: string[];
  cover?: UpdateCover;
  excerpt?: string;
  author?: UserLike | null;
  content?: IUpdateBlock[];
}

export const serializeUpdate = (update: UpdateLike): UpdateEntryDTO => {
  const dto: UpdateEntryDTO = {
    id: String(update._id),
    slug: update.slug,
    title: update.title,
    date: new Date(update.date).toISOString(),
    tags: update.tags ?? [],
    excerpt: update.excerpt ?? "",
    content: update.content ?? [],
  };
  if (update.cover) dto.cover = update.cover;
  if (update.author) dto.author = serializeAuthor(update.author);
  return dto;
};
