import { randomUUID } from 'crypto';

export interface Memo {
  id: string;
  content: string;
  createdAt: Date;
}

export class MemoService {
  private store: Map<string, Memo> = new Map();

  add(content: string): Memo {
    if (!content || content.trim() === '') {
      throw new Error('content는 빈 문자열일 수 없습니다');
    }
    const memo: Memo = {
      id: randomUUID(),
      content: content.trim(),
      createdAt: new Date(),
    };
    this.store.set(memo.id, memo);
    return memo;
  }

  get(id: string): Memo | null {
    return this.store.get(id) ?? null;
  }

  getAll(): Memo[] {
    return Array.from(this.store.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  delete(id: string): boolean {
    if (!this.store.has(id)) return false;
    this.store.delete(id);
    return true;
  }
}
