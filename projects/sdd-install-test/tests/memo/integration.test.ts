import * as fs from "fs/promises";
import * as path from "path";
import { JsonMemoRepository } from "../../src/memo/json-memo.repository";
import { MemoService } from "../../src/memo/memo.service";
import { NotFoundError } from "../../src/memo/errors";

const TEST_DATA_FILE = path.join(__dirname, "../../data/integration-test-memos.json");

describe("Integration: MemoService + JsonMemoRepository", () => {
  let service: MemoService;

  beforeEach(async () => {
    try {
      await fs.unlink(TEST_DATA_FILE);
    } catch {
      // 파일 없어도 무시
    }
    const repo = new JsonMemoRepository(TEST_DATA_FILE);
    service = new MemoService(repo);
  });

  afterAll(async () => {
    try {
      await fs.unlink(TEST_DATA_FILE);
    } catch {
      // 무시
    }
  });

  it("AC-2.1-1: 파일 없는 상태에서 시작해 빈 목록을 반환한다", async () => {
    const list = await service.list();
    expect(list).toEqual([]);
  });

  it("E2E: 생성 → 조회 → 수정 → 삭제 전체 흐름", async () => {
    // 생성
    const created = await service.create({ title: "통합 테스트 메모", body: "내용" });
    expect(created.id).toBeTruthy();

    // 목록 조회
    const list = await service.list();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("통합 테스트 메모");

    // 상세 조회
    const found = await service.get(created.id);
    expect(found.body).toBe("내용");

    // 수정
    const updated = await service.update(created.id, { title: "수정된 제목" });
    expect(updated.title).toBe("수정된 제목");

    // 삭제
    await service.delete(created.id);
    await expect(service.get(created.id)).rejects.toThrow(NotFoundError);

    // 삭제 후 빈 목록
    const emptyList = await service.list();
    expect(emptyList).toEqual([]);
  });

  it("실제 파일에 데이터가 영속화된다", async () => {
    await service.create({ title: "영속성 테스트", body: "저장됨" });

    // 새 service 인스턴스로 같은 파일 읽기 (재시작 시뮬레이션)
    const repo2 = new JsonMemoRepository(TEST_DATA_FILE);
    const service2 = new MemoService(repo2);
    const list = await service2.list();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("영속성 테스트");
  });
});
