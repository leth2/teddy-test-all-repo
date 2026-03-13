import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db;

/**
 * SQLite DB 연결 및 스키마 초기화
 * @param {string} [dbPath] - DB 파일 경로. 기본값: ../../urls.db
 * @returns {import('better-sqlite3').Database}
 */
export function getDatabase(dbPath) {
  if (db) return db;

  const resolvedPath = dbPath || join(__dirname, '..', '..', 'urls.db');
  db = new Database(resolvedPath);

  // WAL 모드: 동시 읽기 성능 향상
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // 스키마 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      original_url TEXT NOT NULL,
      tag TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url_id INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
      clicked_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      date TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_urls_code ON urls(code);
    CREATE INDEX IF NOT EXISTS idx_clicks_url_id ON clicks(url_id);
    CREATE INDEX IF NOT EXISTS idx_clicks_date ON clicks(date);
  `);

  return db;
}

/**
 * 테스트용: DB 인스턴스 교체
 */
export function setDatabase(instance) {
  db = instance;
}

/**
 * 테스트용: DB 인스턴스 초기화
 */
export function resetDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

export default getDatabase;
