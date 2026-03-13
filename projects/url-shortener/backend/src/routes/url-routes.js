import { Router } from 'express';
import { nanoid } from 'nanoid';
import { getDatabase } from '../db/database.js';

const router = Router();

/**
 * URL 유효성 검사
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * POST /api/shorten
 * { url: string, tag?: string } → { code, shortUrl, tag }
 */
router.post('/api/shorten', (req, res) => {
  const { url, tag } = req.body;

  if (!isValidUrl(url)) {
    return res.status(400).json({ error: 'URL이 유효하지 않습니다. http:// 또는 https://로 시작해야 합니다.' });
  }

  const db = getDatabase();
  const code = nanoid(8);

  const stmt = db.prepare(
    'INSERT INTO urls (code, original_url, tag) VALUES (?, ?, ?)'
  );

  const result = stmt.run(code, url, tag || null);

  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const shortUrl = `${baseUrl}/${code}`;

  res.status(201).json({ code, shortUrl, tag: tag || null });
});

/**
 * GET /:code
 * 짧은 코드로 원본 URL로 리다이렉트, 클릭 기록
 */
router.get('/:code', (req, res) => {
  const { code } = req.params;

  // /api 경로는 스킵 (다른 라우터에서 처리)
  if (code === 'api') return res.status(404).json({ error: 'Not found' });

  const db = getDatabase();
  const url = db.prepare('SELECT id, original_url FROM urls WHERE code = ?').get(code);

  if (!url) {
    return res.status(404).json({ error: 'Not found' });
  }

  // 클릭 기록
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  db.prepare('INSERT INTO clicks (url_id, date) VALUES (?, ?)').run(url.id, today);

  res.redirect(302, url.original_url);
});

export default router;
