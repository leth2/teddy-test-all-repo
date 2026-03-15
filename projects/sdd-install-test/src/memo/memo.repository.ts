import { Memo } from "./memo";

export interface IMemoRepository {
  findAll(): Promise<Memo[]>;
  findById(id: string): Promise<Memo | undefined>;
  save(memo: Memo): Promise<void>;
  saveAll(memos: Memo[]): Promise<void>;
}
