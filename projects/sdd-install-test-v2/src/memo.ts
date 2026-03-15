export interface Memo {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemoInput {
  title: string;
  content: string;
}

export interface UpdateMemoInput {
  title?: string;
  content?: string;
}
