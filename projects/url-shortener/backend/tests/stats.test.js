import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestDb, cleanupTestDb } from './setup.js';

describe('GET /api/stats', () => {
  let db;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  it('빈 목록을 반환한다 (URL 없는 경우)', async () => {
    const res = await request(app).get('/api/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('단축된 URL 목록과 클릭 수를 반환한다', async () => {
    // URL 2개 생성
    await request(app).post('/api/shorten').send({ url: 'https://example.com', tag: 'test' });
    await request(app).post('/api/shorten').send({ url: 'https://google.com' });

    const res = await request(app).get('/api/stats');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    const item = res.body[0];
    expect(item).toHaveProperty('code');
    expect(item).toHaveProperty('originalUrl');
    expect(item).toHaveProperty('tag');
    expect(item).toHaveProperty('totalClicks');
    expect(item).toHaveProperty('createdAt');
  });

  it('결과는 생성일 내림차순으로 정렬된다', async () => {
    await request(app).post('/api/shorten').send({ url: 'https://first.com' });
    await request(app).post('/api/shorten').send({ url: 'https://second.com' });

    const res = await request(app).get('/api/stats');

    expect(res.status).toBe(200);
    // 나중에 생성된 것이 먼저 나온다
    expect(res.body[0].originalUrl).toBe('https://second.com');
    expect(res.body[1].originalUrl).toBe('https://first.com');
  });

  it('클릭 수를 정확하게 집계한다', async () => {
    const shortenRes = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com' });
    const { code } = shortenRes.body;

    // 3번 클릭
    await request(app).get(`/${code}`).redirects(0);
    await request(app).get(`/${code}`).redirects(0);
    await request(app).get(`/${code}`).redirects(0);

    const statsRes = await request(app).get('/api/stats');
    expect(statsRes.body[0].totalClicks).toBe(3);
  });

  it('태그로 필터링할 수 있다', async () => {
    await request(app).post('/api/shorten').send({ url: 'https://a.com', tag: 'alpha' });
    await request(app).post('/api/shorten').send({ url: 'https://b.com', tag: 'beta' });
    await request(app).post('/api/shorten').send({ url: 'https://c.com', tag: 'alpha' });

    const res = await request(app).get('/api/stats?tag=alpha');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    res.body.forEach(item => expect(item.tag).toBe('alpha'));
  });
});

describe('GET /api/stats/:code', () => {
  let db;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    cleanupTestDb(db);
  });

  it('특정 코드의 상세 통계를 반환한다', async () => {
    const shortenRes = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com', tag: 'detail-test' });
    const { code } = shortenRes.body;

    const res = await request(app).get(`/api/stats/${code}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(code);
    expect(res.body.originalUrl).toBe('https://example.com');
    expect(res.body.tag).toBe('detail-test');
    expect(res.body).toHaveProperty('totalClicks');
    expect(res.body).toHaveProperty('dailyClicks');
    expect(Array.isArray(res.body.dailyClicks)).toBe(true);
  });

  it('클릭 후 날짜별 클릭 데이터가 포함된다', async () => {
    const shortenRes = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com' });
    const { code } = shortenRes.body;

    // 클릭 2번
    await request(app).get(`/${code}`).redirects(0);
    await request(app).get(`/${code}`).redirects(0);

    const res = await request(app).get(`/api/stats/${code}`);

    expect(res.status).toBe(200);
    expect(res.body.totalClicks).toBe(2);
    expect(res.body.dailyClicks.length).toBeGreaterThan(0);

    const today = new Date().toISOString().slice(0, 10);
    const todayClicks = res.body.dailyClicks.find(d => d.date === today);
    expect(todayClicks).toBeDefined();
    expect(todayClicks.clicks).toBe(2);
  });

  it('존재하지 않는 코드는 404를 반환한다', async () => {
    const res = await request(app).get('/api/stats/doesnotexist');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('클릭 없는 경우 totalClicks는 0이다', async () => {
    const shortenRes = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com' });
    const { code } = shortenRes.body;

    const res = await request(app).get(`/api/stats/${code}`);

    expect(res.status).toBe(200);
    expect(res.body.totalClicks).toBe(0);
    expect(res.body.dailyClicks).toEqual([]);
  });
});
