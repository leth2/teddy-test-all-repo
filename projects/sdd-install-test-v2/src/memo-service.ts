import crypto from 'node:crypto';
import type { Memo, CreateMemoInput, UpdateMemoInput } from './memo.js';
import { MemoRepository } from './memo-repository.js';

export class MemoService {
  constructor(private readonly repository: MemoRepository) {}

  create(input: CreateMemoInput): Memo {
    if (!input.title) {
      throw new Error('Title is required');
    }

    const now = new Date().toISOString();
    const memo: Memo = {
      id: crypto.randomUUID(),
      title: input.title,
      content: input.content,
      createdAt: now,
      updatedAt: now,
    };

    const memos = this.repository.loadAll();
    memos.push(memo);
    this.repository.saveAll(memos);

    return memo;
  }

  findAll(): Memo[] {
    return this.repository.loadAll();
  }

  findById(id: string): Memo | null {
    const memos = this.repository.loadAll();
    return memos.find((m) => m.id === id) ?? null;
  }

  update(id: string, input: UpdateMemoInput): Memo | null {
    const memos = this.repository.loadAll();
    const index = memos.findIndex((m) => m.id === id);
    if (index === -1) {
      return null;
    }

    const memo = memos[index];
    if (input.title !== undefined) {
      memo.title = input.title;
    }
    if (input.content !== undefined) {
      memo.content = input.content;
    }
    memo.updatedAt = new Date().toISOString();

    this.repository.saveAll(memos);
    return memo;
  }

  remove(id: string): boolean {
    const memos = this.repository.loadAll();
    const index = memos.findIndex((m) => m.id === id);
    if (index === -1) {
      return false;
    }

    memos.splice(index, 1);
    this.repository.saveAll(memos);
    return true;
  }
}
