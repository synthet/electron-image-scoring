import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { normalizeAppConfig } from './config';

describe('config examples', () => {
  function loadExample(filename: string) {
    const filePath = path.resolve(__dirname, '..', filename);
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return normalizeAppConfig(raw);
  }

  it('normalizes config.example.json to postgres defaults with nested postgres config', () => {
    const normalized = loadExample('config.example.json');

    const database = normalized.database;
    if (!database) {
      throw new Error('Expected database configuration in config.example.json');
    }

    expect(database.engine).toBe('postgres');

    if (database.engine !== 'postgres' || !('postgres' in database)) {
      throw new Error('Expected postgres database configuration in config.example.json');
    }

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
    if (!database) {
      throw new Error('Expected database configuration in environment.example.json');
    }

    expect(database.engine).toBe('postgres');

    if (database.engine !== 'postgres' || !('postgres' in database)) {
      throw new Error('Expected postgres database configuration in environment.example.json');
    }

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
    if (!database) {
      throw new Error('Expected database configuration for api-mode input');
    }

    expect(database.engine).toBe('api');

    if (database.engine !== 'api' || !('api' in database)) {
      throw new Error('Expected api database configuration for api-mode input');
    }

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
