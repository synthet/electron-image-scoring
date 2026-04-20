import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { normalizeAppConfig } from './config';
import type { ApiDatabaseConfig, PostgresDatabaseConfig } from './types';

function isPostgresDatabaseConfig(database: unknown): database is PostgresDatabaseConfig {
  return Boolean(
    database
    && typeof database === 'object'
    && 'engine' in database
    && (database as { engine?: unknown }).engine === 'postgres'
    && 'postgres' in database,
  );
}

function isApiDatabaseConfig(database: unknown): database is ApiDatabaseConfig {
  return Boolean(
    database
    && typeof database === 'object'
    && 'engine' in database
    && (database as { engine?: unknown }).engine === 'api'
    && 'api' in database,
  );
}

describe('config examples', () => {
  function loadExample(filename: string) {
    const filePath = path.resolve(__dirname, '..', filename);
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return normalizeAppConfig(raw);
  }

  it('normalizes config.example.json to postgres defaults with nested postgres config', () => {
    const normalized = loadExample('config.example.json');
    const database = normalized.database;

    expect(database).toBeDefined();
    expect(isPostgresDatabaseConfig(database)).toBe(true);

    if (!isPostgresDatabaseConfig(database)) {
      return;
    }

    expect(database.engine).toBe('postgres');
    expect(database.provider).toBe('postgres');
    expect(database.postgres).toMatchObject({
      host: '127.0.0.1',
      port: 5432,
      database: 'image_scoring',
      user: 'postgres',
      password: 'postgres',
    });
  });

  it('normalizes environment.example.json with postgres shape and defaults', () => {
    const normalized = loadExample('environment.example.json');
    const database = normalized.database;

    expect(database).toBeDefined();
    expect(isPostgresDatabaseConfig(database)).toBe(true);

    if (!isPostgresDatabaseConfig(database)) {
      return;
    }

    expect(database.engine).toBe('postgres');
    expect(database.provider).toBe('postgres');
    expect(database.postgres).toMatchObject({
      host: '127.0.0.1',
      port: 5432,
      database: 'image_scoring',
      user: 'postgres',
      password: 'postgres',
    });
    expect(database).not.toHaveProperty('api');
  });

  it('normalizes api-mode config shape with api-specific fields', () => {
    const normalized = normalizeAppConfig({
      database: {
        engine: 'api',
        api: {
          url: 'http://localhost:8000',
          timeout: 5000,
        },
      },
    });
    const database = normalized.database;

    expect(database).toBeDefined();
    expect(isApiDatabaseConfig(database)).toBe(true);

    if (!isApiDatabaseConfig(database)) {
      return;
    }

    expect(database.engine).toBe('api');
    expect(database.provider).toBe('api');
    expect(database.api).toMatchObject({
      url: 'http://localhost:8000',
      timeout: 5000,
      dialect: 'postgres',
      sqlDialect: 'postgres',
    });
    expect(database).not.toHaveProperty('postgres');
  });
});
