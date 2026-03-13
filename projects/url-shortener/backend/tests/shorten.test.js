import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestDb, cleanupTestDb } from './setup.js';

describe('POST /api/shorten', () => {
  let db;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  it('유효한 URL로 단축 코드를 생성한다', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://www.example.com/very/long/url/here' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('code');
    expect(res.body).toHaveProperty('shortUrl');
    expect(res.body.code).toHaveLength(8);
    expect(res.body.shortUrl).toContain(res.body.code);
  });

  it('동일한 URL을 두 번 제출하면 다른 코드가 생성된다', async () => {
    const url = 'https://www.example.com';

    const res1 = await request(app).post('/api/shorten').send({ url });
    const res2 = await request(app).post('/api/shorten').send({ url });

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    expect(res1.body.code).not.toBe(res2.body.code);
  });

  it('태그를 포함하여 단축할 수 있다', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com', tag: 'marketing' });

    expect(res.status).toBe(201);
    expect(res.body.tag).toBe('marketing');
  });

  it('태그 없이도 단축할 수 있다', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(201);
    expect(res.body.tag).toBeNull();
  });

  it('유효하지 않은 URL은 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'not-a-valid-url' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('빈 URL은 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: '' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('URL 없이 요청하면 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('GET /:code (리다이렉트)', () => {
  let db;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  it('유효한 코드로 원본 URL로 리다이렉트한다', async () => {
    // 먼저 단축 URL 생성
    const shortenRes = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://www.example.com' });

    const { code } = shortenRes.body;

    const res = await request(app)
      .get(`/${code}`)
      .redirects(0); // 리다이렉트 따라가지 않음

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://www.example.com');
  });

  it('리다이렉트 후 클릭 수가 증가한다', async () => {
    const shortenRes = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://www.example.com' });

    const { code } = shortenRes.body;

    // 2번 클릭
    await request(app).get(`/${code}`).redirects(0);
    await request(app).get(`/${code}`).redirects(0);

    const statsRes = await request(app).get(`/api/stats/${code}`);
    expect(statsRes.body.totalClicks).toBe(2);
  });

  it('존재하지 않는 코드는 404를 반환한다', async () => {
    const res = await request(app).get('/nonexistent');

    expect(res.status).toBe(404);
  });
});
