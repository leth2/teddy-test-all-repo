import fs from 'node:fs';
import path from 'node:path';
import type { Memo } from './memo.js';

export class MemoRepository {
  constructor(private readonly dataPath: string) {}

  loadAll(): Memo[] {
    if (!fs.existsSync(this.dataPath)) {
      return [];
    }
    const data = fs.readFileSync(this.dataPath, 'utf-8');
    return JSON.parse(data) as Memo[];
  }

  saveAll(memos: Memo[]): void {
    const dir = path.dirname(this.dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.dataPath, JSON.stringify(memos, null, 2));
  }
}
