import { MemoService } from '../src/MemoService';

describe('MemoService', () => {
  let svc: MemoService;
  beforeEach(() => { svc = new MemoService(); });

  describe('add()', () => {
    it('메모를 추가하고 id/content/createdAt을 반환한다', () => {
      const memo = svc.add('Hello');
      expect(memo.id).toBeTruthy();
      expect(memo.content).toBe('Hello');
      expect(memo.createdAt).toBeInstanceOf(Date);
    });
    it('같은 내용도 항상 새 ID를 생성한다', () => {
      const a = svc.add('dup');
      const b = svc.add('dup');
      expect(a.id).not.toBe(b.id);
    });
    it('빈 content면 에러를 던진다', () => {
      expect(() => svc.add('')).toThrow();
      expect(() => svc.add('   ')).toThrow();
    });
  });

  describe('get()', () => {
    it('존재하는 ID → 메모 반환', () => {
      const memo = svc.add('test');
      expect(svc.get(memo.id)).toEqual(memo);
    });
    it('존재하지 않는 ID → null 반환', () => {
      expect(svc.get('no-such-id')).toBeNull();
    });
  });

  describe('getAll()', () => {
    it('최신 메모가 앞에 오도록 역순 정렬', async () => {
      const a = svc.add('first');
      await new Promise(r => setTimeout(r, 10));
      const b = svc.add('second');
      const all = svc.getAll();
      expect(all[0].id).toBe(b.id);
      expect(all[1].id).toBe(a.id);
    });
  });

  describe('delete()', () => {
    it('존재하는 ID → 삭제 후 true 반환', () => {
      const memo = svc.add('bye');
      expect(svc.delete(memo.id)).toBe(true);
      expect(svc.get(memo.id)).toBeNull();
    });
    it('존재하지 않는 ID → false 반환', () => {
      expect(svc.delete('ghost')).toBe(false);
    });
  });
});
