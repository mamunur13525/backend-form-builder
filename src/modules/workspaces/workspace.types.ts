export interface CreateWorkspaceBody {
  name: string;
  description?: string;
}

export interface UpdateWorkspaceBody {
  name?: string;
  description?: string;
}

export interface AddMemberBody {
  userId: string;
  role: "admin" | "editor" | "viewer";
}