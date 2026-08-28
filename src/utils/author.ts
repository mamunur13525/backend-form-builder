/**
 * Shared "author" projection. Feedback posts, comments and update entries all
 * surface the same lightweight author shape derived from a User document.
 */

export interface AuthorDTO {
  id: string;
  name: string;
  /** Two-letter fallback shown when there's no avatar image. */
  initials: string;
  /** Deterministic avatar background (used with initials). */
  color: string;
  /** Team members get the small orange badge on their avatar. */
  isAdmin?: boolean;
}

/** A populated User (lean) — only the fields the serializers rely on. */
export interface UserLike {
  _id: unknown;
  name?: string;
  role?: string;
}

/**
 * Soft avatar palette. A user's colour is picked deterministically from their
 * id so the same person always renders with the same background.
 */
const AVATAR_COLORS = [
  "#fcd9c8",
  "#dbeafe",
  "#dcfce7",
  "#fef3c7",
  "#ede9fe",
  "#fce7f3",
  "#ccfbf1",
  "#fee2e2",
];

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const initialsOf = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

export const serializeAuthor = (user: UserLike | null | undefined): AuthorDTO => {
  if (!user) {
    return { id: "unknown", name: "Unknown", initials: "?", color: "#e5e7eb" };
  }
  const id = String(user._id);
  const name = user.name ?? "Unknown";
  const author: AuthorDTO = {
    id,
    name,
    initials: initialsOf(name),
    color: AVATAR_COLORS[hashString(id) % AVATAR_COLORS.length],
  };
  if (user.role === "admin") author.isAdmin = true;
  return author;
};
