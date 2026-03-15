export interface Memo {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemoInput {
  title: string;
  body: string;
}

export interface UpdateMemoInput {
  title?: string;
  body?: string;
}

export interface MemoSummary {
  id: string;
  title: string;
  createdAt: string;
}
