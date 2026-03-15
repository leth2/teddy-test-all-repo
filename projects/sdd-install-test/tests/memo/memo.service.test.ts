import { MemoService } from "../../src/memo/memo.service";
import { IMemoRepository } from "../../src/memo/memo.repository";
import { Memo } from "../../src/memo/memo";
import { ValidationError, NotFoundError } from "../../src/memo/errors";

// In-memory mock repository for unit tests
class MockMemoRepository implements IMemoRepository {
  private memos: Memo[] = [];

  async findAll(): Promise<Memo[]> {
    return [...this.memos];
  }

  async findById(id: string): Promise<Memo | undefined> {
    return this.memos.find((m) => m.id === id);
  }

  async save(memo: Memo): Promise<void> {
    const index = this.memos.findIndex((m) => m.id === memo.id);
    if (index >= 0) {
      this.memos[index] = memo;
    } else {
      this.memos.push(memo);
    }
  }

  async saveAll(memos: Memo[]): Promise<void> {
    this.memos = [...memos];
  }
}

describe("MemoService", () => {
  let service: MemoService;
  let repo: MockMemoRepository;

  beforeEach(() => {
    repo = new MockMemoRepository();
    service = new MemoService(repo);
  });

  describe("create", () => {
    it("AC-1.1-1: 유효한 입력으로 메모를 생성하고 반환한다", async () => {
      const memo = await service.create({ title: "제목", body: "본문" });
      expect(memo.title).toBe("제목");
      expect(memo.body).toBe("본문");
    });

    it("AC-1.1-2: 빈 제목으로 생성하면 ValidationError를 던진다", async () => {
      await expect(service.create({ title: "", body: "본문" })).rejects.toThrow(
        ValidationError
      );
    });

    it("AC-1.1-3: 생성된 메모는 고유 id와 createdAt을 포함한다", async () => {
      const memo = await service.create({ title: "제목", body: "본문" });
      expect(memo.id).toBeTruthy();
      expect(memo.createdAt).toBeTruthy();
      expect(new Date(memo.createdAt).toISOString()).toBe(memo.createdAt);
    });
  });

  describe("list", () => {
    it("AC-1.2-1: 메모가 없으면 빈 배열을 반환한다", async () => {
      const result = await service.list();
      expect(result).toEqual([]);
    });

    it("AC-1.2-2: 메모가 2개이면 길이 2의 배열을 반환한다", async () => {
      await service.create({ title: "메모1", body: "내용1" });
      await service.create({ title: "메모2", body: "내용2" });
      const result = await service.list();
      expect(result).toHaveLength(2);
    });

    it("AC-1.2-3: 각 항목은 id, title, createdAt을 포함한다", async () => {
      await service.create({ title: "메모", body: "내용" });
      const result = await service.list();
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("title");
      expect(result[0]).toHaveProperty("createdAt");
    });
  });

  describe("get", () => {
    it("AC-1.3-1: 존재하는 ID로 상세 조회하면 메모를 반환한다", async () => {
      const created = await service.create({ title: "제목", body: "본문" });
      const found = await service.get(created.id);
      expect(found.id).toBe(created.id);
      expect(found.body).toBe("본문");
      expect(found).toHaveProperty("updatedAt");
    });

    it("AC-1.3-2: 존재하지 않는 ID로 조회하면 NotFoundError를 던진다", async () => {
      await expect(service.get("no-such-id")).rejects.toThrow(NotFoundError);
    });
  });

  describe("update", () => {
    it("AC-1.4-1: 유효한 제목으로 수정하면 갱신된 메모를 반환한다", async () => {
      const created = await service.create({ title: "원본", body: "내용" });
      const updated = await service.update(created.id, { title: "수정됨" });
      expect(updated.title).toBe("수정됨");
    });

    it("AC-1.4-2: 수정 후 updatedAt이 갱신된다", async () => {
      const created = await service.create({ title: "원본", body: "내용" });
      // 시간 차이를 두기 위해 1ms 대기
      await new Promise((r) => setTimeout(r, 1));
      const updated = await service.update(created.id, { title: "수정됨" });
      expect(updated.updatedAt >= updated.createdAt).toBe(true);
    });

    it("AC-1.4-3: 존재하지 않는 ID로 수정하면 NotFoundError를 던진다", async () => {
      await expect(
        service.update("no-such-id", { title: "수정" })
      ).rejects.toThrow(NotFoundError);
    });

    it("AC-1.4-4: 빈 문자열 제목으로 수정하면 ValidationError를 던진다", async () => {
      const created = await service.create({ title: "원본", body: "내용" });
      await expect(
        service.update(created.id, { title: "" })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("delete", () => {
    it("AC-1.5-1: 존재하는 ID를 삭제하면 오류 없이 완료된다", async () => {
      const created = await service.create({ title: "삭제대상", body: "내용" });
      await expect(service.delete(created.id)).resolves.toBeUndefined();
    });

    it("AC-1.5-2: 삭제 후 동일 ID로 조회하면 NotFoundError를 던진다", async () => {
      const created = await service.create({ title: "삭제대상", body: "내용" });
      await service.delete(created.id);
      await expect(service.get(created.id)).rejects.toThrow(NotFoundError);
    });

    it("AC-1.5-3: 존재하지 않는 ID를 삭제하면 NotFoundError를 던진다", async () => {
      await expect(service.delete("no-such-id")).rejects.toThrow(NotFoundError);
    });
  });
});
