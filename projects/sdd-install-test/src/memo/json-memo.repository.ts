import * as fs from "fs/promises";
import * as path from "path";
import { Memo } from "./memo";
import { IMemoRepository } from "./memo.repository";

export class JsonMemoRepository implements IMemoRepository {
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath =
      filePath ?? path.join(process.cwd(), "data", "memos.json");
  }

  async findAll(): Promise<Memo[]> {
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      return JSON.parse(raw) as Memo[];
    } catch {
      return [];
    }
  }

  async findById(id: string): Promise<Memo | undefined> {
    const all = await this.findAll();
    return all.find((m) => m.id === id);
  }

  async save(memo: Memo): Promise<void> {
    const all = await this.findAll();
    const index = all.findIndex((m) => m.id === memo.id);
    if (index >= 0) {
      all[index] = memo;
    } else {
      all.push(memo);
    }
    await this.saveAll(all);
  }

  async saveAll(memos: Memo[]): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(memos, null, 2), "utf-8");
  }
}
