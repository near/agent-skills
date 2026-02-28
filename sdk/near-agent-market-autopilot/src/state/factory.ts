import type { StateDriverConfig, StateStore } from '../types.js';
import { FileStateStore } from './file-store.js';
import { SqliteStateStore } from './sqlite-store.js';

export function createStateStore(config: StateDriverConfig): StateStore {
  if (config.driver === 'sqlite') {
    return new SqliteStateStore(config.path);
  }
  return new FileStateStore(config.path);
}
