import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoService } from './memo-service.js';
import { MemoRepository } from './memo-repository.js';

describe('Integration: full CRUD flow', () => {
  let tmpDir: string;
  let dataPath: string;
  let service: MemoService;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memo-integ-'));
    dataPath = path.join(tmpDir, 'memos.json');
    service = new MemoService(new MemoRepository(dataPath));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should perform create → findAll → findById → update → remove cycle', () => {
    // Create
    const memo = service.create({ title: '첫 메모', content: '내용입니다' });
    expect(memo.title).toBe('첫 메모');

    // FindAll
    const all = service.findAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(memo.id);

    // FindById
    const found = service.findById(memo.id);
    expect(found).toEqual(memo);

    // Update
    const updated = service.update(memo.id, { title: '수정된 메모' });
    expect(updated?.title).toBe('수정된 메모');
    expect(updated?.content).toBe('내용입니다');

    // Remove
    expect(service.remove(memo.id)).toBe(true);
    expect(service.findById(memo.id)).toBeNull();
    expect(service.findAll()).toHaveLength(0);
  });

  it('should persist data across service instances', () => {
    // Create with first instance
    service.create({ title: 'Persist', content: 'Test' });

    // Read with new instance (simulates app restart)
    const newService = new MemoService(new MemoRepository(dataPath));
    const all = newService.findAll();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('Persist');
  });

  it('should handle multiple memos correctly', () => {
    service.create({ title: 'A', content: '1' });
    service.create({ title: 'B', content: '2' });
    service.create({ title: 'C', content: '3' });

    expect(service.findAll()).toHaveLength(3);

    // Delete middle one
    const all = service.findAll();
    service.remove(all[1].id);
    expect(service.findAll()).toHaveLength(2);
  });
});
