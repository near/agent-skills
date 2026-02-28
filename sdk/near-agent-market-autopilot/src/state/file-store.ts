import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { StateStore } from '../types.js';

type FileDb = Record<string, unknown>;

export class FileStateStore implements StateStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const db = await this.readDb();
    return db[key] as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const db = await this.readDb();
    db[key] = value;
    await this.writeDb(db);
  }

  async del(key: string): Promise<void> {
    const db = await this.readDb();
    delete db[key];
    await this.writeDb(db);
  }

  async keys(prefix: string): Promise<string[]> {
    const db = await this.readDb();
    return Object.keys(db).filter(key => key.startsWith(prefix));
  }

  private async ensureDir(): Promise<void> {
    const directory = path.dirname(this.filePath);
    await mkdir(directory, { recursive: true });
  }

  private async readDb(): Promise<FileDb> {
    await this.ensureDir();
    try {
      const text = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as FileDb;
      }
      return {};
    } catch {
      return {};
    }
  }

  private async writeDb(db: FileDb): Promise<void> {
    await this.ensureDir();
    const tempPath = `${this.filePath}.tmp`;
    await writeFile(tempPath, JSON.stringify(db, null, 2), 'utf8');
    await rename(tempPath, this.filePath);
  }
}
