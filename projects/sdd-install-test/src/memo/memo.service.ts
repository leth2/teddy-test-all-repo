import { randomUUID } from "crypto";
import { Memo, CreateMemoInput, UpdateMemoInput, MemoSummary } from "./memo";
import { IMemoRepository } from "./memo.repository";
import { ValidationError, NotFoundError } from "./errors";

export interface IMemoService {
  create(input: CreateMemoInput): Promise<Memo>;
  list(): Promise<MemoSummary[]>;
  get(id: string): Promise<Memo>;
  update(id: string, input: UpdateMemoInput): Promise<Memo>;
  delete(id: string): Promise<void>;
}

export class MemoService implements IMemoService {
  constructor(private readonly repo: IMemoRepository) {}

  async create(input: CreateMemoInput): Promise<Memo> {
    if (!input.title.trim()) {
      throw new ValidationError("제목은 비어있을 수 없습니다.");
    }
    const now = new Date().toISOString();
    const memo: Memo = {
      id: randomUUID(),
      title: input.title,
      body: input.body,
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.save(memo);
    return memo;
  }

  async list(): Promise<MemoSummary[]> {
    const all = await this.repo.findAll();
    return all.map((m) => ({
      id: m.id,
      title: m.title,
      createdAt: m.createdAt,
    }));
  }

  async get(id: string): Promise<Memo> {
    const memo = await this.repo.findById(id);
    if (!memo) {
      throw new NotFoundError(id);
    }
    return memo;
  }

  async update(id: string, input: UpdateMemoInput): Promise<Memo> {
    const memo = await this.repo.findById(id);
    if (!memo) {
      throw new NotFoundError(id);
    }
    if (input.title !== undefined && !input.title.trim()) {
      throw new ValidationError("제목은 비어있을 수 없습니다.");
    }
    const updated: Memo = {
      ...memo,
      title: input.title !== undefined ? input.title : memo.title,
      body: input.body !== undefined ? input.body : memo.body,
      updatedAt: new Date().toISOString(),
    };
    await this.repo.save(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const all = await this.repo.findAll();
    const index = all.findIndex((m) => m.id === id);
    if (index < 0) {
      throw new NotFoundError(id);
    }
    all.splice(index, 1);
    await this.repo.saveAll(all);
  }
}
