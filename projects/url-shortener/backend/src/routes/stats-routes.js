import { Router } from 'express';
import { getDatabase } from '../db/database.js';

const router = Router();

/**
 * GET /api/stats
 * 모든 단축 URL 목록과 총 클릭 수 반환 (생성일 내림차순)
 */
router.get('/stats', (req, res) => {
  const db = getDatabase();
  const { tag } = req.query;

  let query = `
    SELECT
      u.code,
      u.original_url AS originalUrl,
      u.tag,
      COUNT(c.id) AS totalClicks,
      datetime(u.created_at, 'unixepoch') AS createdAt
    FROM urls u
    LEFT JOIN clicks c ON c.url_id = u.id
  `;

  const params = [];
  if (tag) {
    query += ' WHERE u.tag = ?';
    params.push(tag);
  }

  query += ' GROUP BY u.id ORDER BY u.created_at DESC, u.id DESC';

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

/**
 * GET /api/stats/:code
 * 특정 코드의 상세 통계 (날짜별 클릭 포함)
 */
router.get('/stats/:code', (req, res) => {
  const { code } = req.params;
  const db = getDatabase();

  const url = db.prepare(`
    SELECT
      u.code,
      u.original_url AS originalUrl,
      u.tag,
      COUNT(c.id) AS totalClicks,
      datetime(u.created_at, 'unixepoch') AS createdAt
    FROM urls u
    LEFT JOIN clicks c ON c.url_id = u.id
    WHERE u.code = ?
    GROUP BY u.id
  `).get(code);

  if (!url) {
    return res.status(404).json({ error: 'Not found' });
  }

  // 날짜별 클릭 집계
  const dailyClicks = db.prepare(`
    SELECT date, COUNT(*) AS clicks
    FROM clicks
    WHERE url_id = (SELECT id FROM urls WHERE code = ?)
    GROUP BY date
    ORDER BY date ASC
  `).all(code);

  res.json({ ...url, dailyClicks });
});

export default router;
