import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { generateUniqueSlug } from "../../utils/slug";
import * as updateRepo from "./update.repository";
import { serializeUpdate } from "./update.serializer";
import {
  CreateUpdateBody,
  ProductActivityDTO,
  UpdateEntryDTO,
  UpdateUpdateBody,
} from "./update.types";

const WEEKS = 12;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export const listUpdates = async (): Promise<UpdateEntryDTO[]> => {
  const updates = await updateRepo.findAll();
  return updates.map(serializeUpdate);
};

export const getUpdate = async (slug: string): Promise<UpdateEntryDTO> => {
  const update = await updateRepo.findBySlug(slug);
  if (!update) throw new ApiError(httpStatus.NOT_FOUND, "Update not found");
  return serializeUpdate(update);
};

export const createUpdate = async (
  userId: string,
  data: CreateUpdateBody
): Promise<UpdateEntryDTO> => {
  const slug = await generateUniqueSlug(data.title, updateRepo.slugExists);

  const created = await updateRepo.create({
    slug,
    title: data.title,
    date: data.date ? new Date(data.date) : new Date(),
    tags: data.tags ?? [],
    cover: data.cover,
    excerpt: data.excerpt ?? "",
    author: userId as any,
    content: data.content ?? [],
  });

  return serializeUpdate(created);
};

export const updateUpdate = async (
  id: string,
  data: UpdateUpdateBody
): Promise<UpdateEntryDTO> => {
  const set: Record<string, unknown> = {};
  const unset: Record<string, unknown> = {};

  if (data.title !== undefined) set.title = data.title;
  if (data.date !== undefined) set.date = new Date(data.date);
  if (data.tags !== undefined) set.tags = data.tags;
  if (data.excerpt !== undefined) set.excerpt = data.excerpt;
  if (data.content !== undefined) set.content = data.content;
  if (data.cover === null) unset.cover = "";
  else if (data.cover !== undefined) set.cover = data.cover;

  const mutation: Record<string, unknown> = {};
  if (Object.keys(set).length) mutation.$set = set;
  if (Object.keys(unset).length) mutation.$unset = unset;

  const updated = await updateRepo.updateById(id, mutation);
  if (!updated) throw new ApiError(httpStatus.NOT_FOUND, "Update not found");
  return serializeUpdate(updated);
};

export const deleteUpdate = async (id: string): Promise<void> => {
  const deleted = await updateRepo.deleteById(id);
  if (!deleted) throw new ApiError(httpStatus.NOT_FOUND, "Update not found");
};

export const getProductActivity = async (): Promise<ProductActivityDTO> => {
  const now = Date.now();
  const since = new Date(now - WEEKS * MS_PER_WEEK);
  const dates = await updateRepo.findDatesSince(since);

  // Oldest week first (index 0) → current week last (index WEEKS-1).
  const weeks = new Array(WEEKS).fill(0);
  for (const date of dates) {
    const weeksAgo = Math.floor((now - date.getTime()) / MS_PER_WEEK);
    if (weeksAgo >= 0 && weeksAgo < WEEKS) {
      weeks[WEEKS - 1 - weeksAgo] += 1;
    }
  }

  return { weeks, completed: dates.length };
};
