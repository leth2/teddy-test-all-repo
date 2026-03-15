# Design: memo-app

## 구조

파일 1개: `src/MemoService.ts`

## 인터페이스

```typescript
interface Memo {
  id: string;
  content: string;
  createdAt: Date;
}

class MemoService {
  add(content: string): Memo
  get(id: string): Memo | null
  getAll(): Memo[]
  delete(id: string): boolean
}
```

## ID 생성

`crypto.randomUUID()` 사용 (Node.js 내장, 외부 패키지 불필요)

## 저장소

인메모리 `Map<string, Memo>` — 영속성 없음 (PoC 범위)

## getAll 정렬

`createdAt` 역순 (최신 메모가 앞)
