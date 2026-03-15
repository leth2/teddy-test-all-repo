import * as fs from "fs/promises";
import * as path from "path";
import { JsonMemoRepository } from "../../src/memo/json-memo.repository";
import { Memo } from "../../src/memo/memo";

const TEST_DATA_FILE = path.join(__dirname, "../../data/test-memos.json");

const sampleMemo: Memo = {
  id: "test-id-1",
  title: "테스트 메모",
  body: "본문 내용",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("JsonMemoRepository", () => {
  let repo: JsonMemoRepository;

  beforeEach(async () => {
    // 테스트마다 파일 초기화
    try {
      await fs.unlink(TEST_DATA_FILE);
    } catch {
      // 파일 없어도 무시
    }
    repo = new JsonMemoRepository(TEST_DATA_FILE);
  });

  afterAll(async () => {
    try {
      await fs.unlink(TEST_DATA_FILE);
    } catch {
      // 파일 없어도 무시
    }
  });

  describe("findAll", () => {
    it("AC-2.1-1: 파일이 없으면 빈 배열을 반환한다", async () => {
      const result = await repo.findAll();
      expect(result).toEqual([]);
    });

    it("메모가 저장된 경우 전체 목록을 반환한다", async () => {
      await repo.save(sampleMemo);
      const result = await repo.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("test-id-1");
    });
  });

  describe("findById", () => {
    it("존재하는 ID로 조회하면 메모를 반환한다", async () => {
      await repo.save(sampleMemo);
      const result = await repo.findById("test-id-1");
      expect(result).toBeDefined();
      expect(result?.title).toBe("테스트 메모");
    });

    it("존재하지 않는 ID로 조회하면 undefined를 반환한다", async () => {
      const result = await repo.findById("non-existent");
      expect(result).toBeUndefined();
    });
  });

  describe("save", () => {
    it("메모를 저장하고 findAll로 조회할 수 있다", async () => {
      await repo.save(sampleMemo);
      const all = await repo.findAll();
      expect(all).toHaveLength(1);
    });
  });

  describe("saveAll", () => {
    it("배열로 저장하고 전체 조회가 가능하다", async () => {
      const memo2: Memo = { ...sampleMemo, id: "test-id-2", title: "두 번째" };
      await repo.saveAll([sampleMemo, memo2]);
      const all = await repo.findAll();
      expect(all).toHaveLength(2);
    });
  });
});
