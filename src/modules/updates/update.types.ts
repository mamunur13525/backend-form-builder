import { AuthorDTO } from "../../utils/author";
import { UpdateCover, ITextRun, IUpdateBlock } from "../../models/Update";

export type { UpdateCover } from "../../models/Update";

export interface UpdateEntryDTO {
  id: string;
  slug: string;
  title: string;
  date: string;
  tags: string[];
  cover?: UpdateCover;
  excerpt: string;
  author?: AuthorDTO;
  content: IUpdateBlock[];
}

export type TextRun = ITextRun;
export type UpdateBlock = IUpdateBlock;

export interface CreateUpdateBody {
  title: string;
  date?: string;
  tags?: string[];
  cover?: UpdateCover;
  excerpt?: string;
  content?: IUpdateBlock[];
}

export interface UpdateUpdateBody {
  title?: string;
  date?: string;
  tags?: string[];
  cover?: UpdateCover | null;
  excerpt?: string;
  content?: IUpdateBlock[];
}

export interface ProductActivityDTO {
  weeks: number[];
  completed: number;
}
