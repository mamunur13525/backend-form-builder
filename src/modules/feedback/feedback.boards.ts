import { Board } from "./feedback.types";

/**
 * Feedback boards are a small, fixed taxonomy (mirrors the reference product
 * which ships a single "Feature Requests" board). Kept as a constant rather
 * than a collection so the set is stable and cheap to serve.
 */
export const BOARDS: Board[] = [
  { id: "feature-requests", name: "Feature Requests", color: "#22c55e" },
];

export const DEFAULT_BOARD_ID = BOARDS[0].id;

export const isValidBoardId = (boardId: string): boolean =>
  BOARDS.some((b) => b.id === boardId);

export const boardName = (boardId: string): string =>
  BOARDS.find((b) => b.id === boardId)?.name ?? "Feedback";
