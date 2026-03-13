import Database from 'better-sqlite3';
import { setDatabase, resetDatabase } from '../src/db/database.js';

/**
 * 각 테스트에서 인메모리 SQLite DB 사용
 */
export function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

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

  setDatabase(db);
  return db;
}

export function cleanupTestDb(db) {
  resetDatabase();
}
