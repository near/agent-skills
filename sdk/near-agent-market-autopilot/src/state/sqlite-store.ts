import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import type { StateStore } from '../types.js';

type SqliteDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    run: (...params: unknown[]) => void;
    get: (...params: unknown[]) => { value?: string } | undefined;
    all: (...params: unknown[]) => Array<Record<string, unknown>>;
  };
};

async function openDb(dbPath: string): Promise<SqliteDatabase> {
  const sqlite = await import('node:sqlite').catch(() => null);
  if (!sqlite || !(sqlite as Record<string, unknown>).DatabaseSync) {
    throw new Error(
      'SQLite driver unavailable. Use driver=file, or run on a Node runtime with node:sqlite support.'
    );
  }

  const directory = path.dirname(dbPath);
  await mkdir(directory, { recursive: true });

  const DatabaseSync = (sqlite as unknown as { DatabaseSync: new (filename: string) => SqliteDatabase }).DatabaseSync;
  const db = new DatabaseSync(dbPath);
  db.exec('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  return db;
}

export class SqliteStateStore implements StateStore {
  private readonly dbPath: string;
  private dbPromise?: Promise<SqliteDatabase>;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const db = await this.db();
    const row = db.prepare('SELECT value FROM kv WHERE key = ?').get(key);
    if (!row?.value) return undefined;
    return JSON.parse(row.value) as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const db = await this.db();
    db.prepare('INSERT OR REPLACE INTO kv(key, value) VALUES(?, ?)').run(key, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    const db = await this.db();
    db.prepare('DELETE FROM kv WHERE key = ?').run(key);
  }

  async keys(prefix: string): Promise<string[]> {
    const db = await this.db();
    const rows = db.prepare('SELECT key FROM kv WHERE key LIKE ?').all(`${prefix}%`);
    return rows
      .map(row => row.key)
      .filter((value): value is string => typeof value === 'string');
  }

  private db(): Promise<SqliteDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDb(this.dbPath);
    }
    return this.dbPromise;
  }
}
