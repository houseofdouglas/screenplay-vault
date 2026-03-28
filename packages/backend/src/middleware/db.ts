import type { MiddlewareHandler } from 'hono';
import type Database from 'better-sqlite3';
import { S3Client } from '@aws-sdk/client-s3';
import { S3SQLiteDB } from 's3-sqlite';
import { LocalFileS3Client } from '../dev/local-s3-client.js';
import { initSchema } from '../db/schema.js';
import type { AppEnv } from '../app.js';

/**
 * DB middleware: opens the user's SQLite database from S3 (or local filesystem
 * in development), attaches the underlying `better-sqlite3` Database to the
 * Hono context as `db`, and flushes + closes the S3SQLiteDB wrapper in a
 * `finally` block regardless of whether the handler throws.
 *
 * S3SQLiteDB manages the S3 download/upload lifecycle. The raw `Database`
 * is exposed so repository functions can use the full better-sqlite3 API.
 */
export const dbMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const userId = c.get('userId');
  const hmacSecret = process.env['DB_HMAC_SECRET'] ?? 'dev-secret-that-is-at-least-32-chars!!';
  const bucket = process.env['DB_BUCKET'] ?? 'local';

  const s3 = process.env['NODE_ENV'] === 'development'
    ? (new LocalFileS3Client('./local-data') as unknown as S3Client)
    : new S3Client({});

  const s3db = await S3SQLiteDB.open({
    s3,
    bucket,
    id: userId,
    namespace: 'v1',
    hmacSecret,
    onCreate: initSchema,
  });

  // Access the underlying better-sqlite3 Database.
  // S3SQLiteDB stores it as a private field named `db`; we access it via cast
  // since it's private only at the TypeScript level (no JS runtime restriction).
  const db = (s3db as unknown as { db: Database.Database }).db;
  c.set('db', db);

  try {
    await next();
  } finally {
    // Always flush (upload latest db to S3) and close the connection.
    try {
      await s3db.flush();
    } catch {
      // flush failure is non-fatal to the HTTP response
    }
    await s3db.close();
  }
};
