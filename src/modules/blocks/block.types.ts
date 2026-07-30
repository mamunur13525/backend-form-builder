export interface CreateBlockBody {
  title?: string;
  type?: string;
}

export interface UpdateBlockBody {
  title?: string;
  type?: string;
}

export interface ReorderBlocksBody {
  blockIds: string[];
}