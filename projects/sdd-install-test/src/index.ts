import { JsonMemoRepository } from "./memo/json-memo.repository";
import { MemoService } from "./memo/memo.service";

async function main() {
  const repo = new JsonMemoRepository();
  const service = new MemoService(repo);

  // 메모 생성
  const memo1 = await service.create({
    title: "첫 번째 메모",
    body: "TypeScript 메모 앱 시작!",
  });
  console.log("생성:", memo1);

  const memo2 = await service.create({
    title: "두 번째 메모",
    body: "메모 앱이 잘 동작합니다.",
  });
  console.log("생성:", memo2);

  // 목록 조회
  const list = await service.list();
  console.log("목록:", list);

  // 수정
  const updated = await service.update(memo1.id, { title: "수정된 첫 메모" });
  console.log("수정:", updated);

  // 삭제
  await service.delete(memo2.id);
  console.log("삭제 완료:", memo2.id);

  // 최종 목록
  const finalList = await service.list();
  console.log("최종 목록:", finalList);
}

main().catch(console.error);
