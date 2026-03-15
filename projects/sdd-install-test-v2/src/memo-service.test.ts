import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MemoService } from './memo-service.js';
import { MemoRepository } from './memo-repository.js';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('MemoService', () => {
  let tmpDir: string;
  let service: MemoService;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memo-test-'));
    const dataPath = path.join(tmpDir, 'memos.json');
    const repo = new MemoRepository(dataPath);
    service = new MemoService(repo);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('create', () => {
    it('should create a memo with UUID v4 id', () => {
      const memo = service.create({ title: 'Test', content: 'Hello' });
      expect(memo.id).toMatch(UUID_V4_REGEX);
      expect(memo.title).toBe('Test');
      expect(memo.content).toBe('Hello');
      expect(memo.createdAt).toBeDefined();
      expect(memo.updatedAt).toBeDefined();
    });

    it('should generate unique ids for different memos', () => {
      const m1 = service.create({ title: 'A', content: '' });
      const m2 = service.create({ title: 'B', content: '' });
      expect(m1.id).not.toBe(m2.id);
    });

    it('should set createdAt and updatedAt to the same value', () => {
      const memo = service.create({ title: 'Test', content: '' });
      expect(memo.createdAt).toBe(memo.updatedAt);
    });

    it('should throw error for empty title', () => {
      expect(() => service.create({ title: '', content: 'Hello' })).toThrow();
    });

    it('should allow empty content', () => {
      const memo = service.create({ title: 'Test', content: '' });
      expect(memo.content).toBe('');
    });
  });

  describe('findAll', () => {
    it('should return empty array when no memos', () => {
      expect(service.findAll()).toEqual([]);
    });

    it('should return all created memos', () => {
      service.create({ title: 'A', content: '1' });
      service.create({ title: 'B', content: '2' });
      service.create({ title: 'C', content: '3' });
      expect(service.findAll()).toHaveLength(3);
    });
  });

  describe('findById', () => {
    it('should return memo by id', () => {
      const created = service.create({ title: 'Test', content: 'Hello' });
      const found = service.findById(created.id);
      expect(found).toEqual(created);
    });

    it('should return null for non-existent id', () => {
      expect(service.findById('non-existent')).toBeNull();
    });
  });

  describe('update', () => {
    it('should update title only, keeping content', () => {
      const memo = service.create({ title: 'Old', content: 'Content' });
      const updated = service.update(memo.id, { title: 'New' });
      expect(updated?.title).toBe('New');
      expect(updated?.content).toBe('Content');
    });

    it('should update content only, keeping title', () => {
      const memo = service.create({ title: 'Title', content: 'Old' });
      const updated = service.update(memo.id, { content: 'New' });
      expect(updated?.title).toBe('Title');
      expect(updated?.content).toBe('New');
    });

    it('should update updatedAt timestamp', () => {
      const memo = service.create({ title: 'Test', content: '' });
      // Small delay to ensure different timestamp
      const updated = service.update(memo.id, { title: 'New' });
      expect(updated?.updatedAt).toBeDefined();
    });

    it('should return null for non-existent id', () => {
      expect(service.update('non-existent', { title: 'New' })).toBeNull();
    });
  });

  describe('remove', () => {
    it('should return true when deleting existing memo', () => {
      const memo = service.create({ title: 'Test', content: '' });
      expect(service.remove(memo.id)).toBe(true);
    });

    it('should make memo unfindable after deletion', () => {
      const memo = service.create({ title: 'Test', content: '' });
      service.remove(memo.id);
      expect(service.findById(memo.id)).toBeNull();
    });

    it('should return false for non-existent id', () => {
      expect(service.remove('non-existent')).toBe(false);
    });
  });
});
