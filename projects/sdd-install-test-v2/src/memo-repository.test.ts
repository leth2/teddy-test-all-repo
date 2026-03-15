import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoRepository } from './memo-repository.js';
import type { Memo } from './memo.js';

describe('MemoRepository', () => {
  let tmpDir: string;
  let dataPath: string;
  let repo: MemoRepository;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memo-test-'));
    dataPath = path.join(tmpDir, 'memos.json');
    repo = new MemoRepository(dataPath);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('loadAll', () => {
    it('should return empty array when file does not exist', () => {
      const memos = repo.loadAll();
      expect(memos).toEqual([]);
    });

    it('should return stored memos when file exists', () => {
      const memo: Memo = {
        id: 'test-id',
        title: 'Test',
        content: 'Hello',
        createdAt: '2026-03-15T00:00:00.000Z',
        updatedAt: '2026-03-15T00:00:00.000Z',
      };
      fs.writeFileSync(dataPath, JSON.stringify([memo]));
      const memos = repo.loadAll();
      expect(memos).toEqual([memo]);
    });
  });

  describe('saveAll', () => {
    it('should save memos to file', () => {
      const memo: Memo = {
        id: 'test-id',
        title: 'Test',
        content: 'Hello',
        createdAt: '2026-03-15T00:00:00.000Z',
        updatedAt: '2026-03-15T00:00:00.000Z',
      };
      repo.saveAll([memo]);
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      expect(data).toEqual([memo]);
    });

    it('should create file if it does not exist', () => {
      repo.saveAll([]);
      expect(fs.existsSync(dataPath)).toBe(true);
    });
  });
});
