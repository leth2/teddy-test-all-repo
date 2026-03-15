import { describe, it, expect } from 'vitest';
import type { Memo, CreateMemoInput, UpdateMemoInput } from './memo.js';

describe('Memo types', () => {
  it('should have required Memo fields', () => {
    const memo: Memo = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test',
      content: 'Hello',
      createdAt: '2026-03-15T00:00:00.000Z',
      updatedAt: '2026-03-15T00:00:00.000Z',
    };
    expect(memo.id).toBeDefined();
    expect(memo.title).toBeDefined();
    expect(memo.content).toBeDefined();
    expect(memo.createdAt).toBeDefined();
    expect(memo.updatedAt).toBeDefined();
  });

  it('should have CreateMemoInput with title and content', () => {
    const input: CreateMemoInput = {
      title: 'Test',
      content: 'Hello',
    };
    expect(input.title).toBe('Test');
    expect(input.content).toBe('Hello');
  });

  it('should have UpdateMemoInput with optional title and content', () => {
    const input1: UpdateMemoInput = { title: 'New title' };
    const input2: UpdateMemoInput = { content: 'New content' };
    const input3: UpdateMemoInput = { title: 'T', content: 'C' };
    expect(input1.title).toBe('New title');
    expect(input2.content).toBe('New content');
    expect(input3.title).toBe('T');
  });
});
