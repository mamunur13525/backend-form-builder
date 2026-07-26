export interface CreateBlockBody {
  title?: string;
  description?: string;
  type?: string;
}

export interface UpdateBlockBody {
  title?: string;
  description?: string;
  type?: string;
}

export interface ReorderBlocksBody {
  blockIds: string[];
}