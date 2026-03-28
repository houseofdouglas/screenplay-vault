import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LocalFileS3Client } from './local-s3-client.js';

const BUCKET = 'test-bucket'; // LocalFileS3Client ignores bucket name

function makeTmpDir(): string {
  const dir = join(tmpdir(), `local-s3-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('LocalFileS3Client', () => {
  let baseDir: string;
  let client: LocalFileS3Client;

  beforeEach(() => {
    baseDir = makeTmpDir();
    client = new LocalFileS3Client(baseDir);
  });

  afterEach(() => {
    rmSync(baseDir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // HeadObject
  // -------------------------------------------------------------------------

  describe('HeadObject', () => {
    it('returns ETag and ContentLength for an existing object', async () => {
      const body = Buffer.from('hello world');
      await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: 'test.txt', Body: body }));

      const res = await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: 'test.txt' })) as {
        ETag: string;
        ContentLength: number;
      };

      expect(res.ETag).toMatch(/^"[a-f0-9]{32}"$/);
      expect(res.ContentLength).toBe(body.length);
    });

    it('throws NoSuchKey for a missing object', async () => {
      await expect(
        client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: 'missing.txt' })),
      ).rejects.toMatchObject({ name: 'NoSuchKey' });
    });
  });

  // -------------------------------------------------------------------------
  // GetObject
  // -------------------------------------------------------------------------

  describe('GetObject', () => {
    it('returns the object body and ETag', async () => {
      const body = Buffer.from('screenplay content');
      await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: 'ideas/test.db', Body: body }));

      const res = await client.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: 'ideas/test.db' }),
      ) as { Body: { transformToByteArray: () => Promise<Uint8Array> }; ETag: string };

      const bytes = await res.Body.transformToByteArray();
      expect(Buffer.from(bytes)).toEqual(body);
      expect(res.ETag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it('throws NoSuchKey for a missing object', async () => {
      await expect(
        client.send(new GetObjectCommand({ Bucket: BUCKET, Key: 'missing.db' })),
      ).rejects.toMatchObject({ name: 'NoSuchKey' });
    });

    it('content survives a new client instance (persisted to disk)', async () => {
      const body = Buffer.from('persisted data');
      await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: 'db.bin', Body: body }));

      // Create a fresh client pointing at the same dir.
      const client2 = new LocalFileS3Client(baseDir);
      const res = await client2.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: 'db.bin' }),
      ) as { Body: { transformToByteArray: () => Promise<Uint8Array> } };

      const bytes = await res.Body.transformToByteArray();
      expect(Buffer.from(bytes)).toEqual(body);
    });
  });

  // -------------------------------------------------------------------------
  // PutObject
  // -------------------------------------------------------------------------

  describe('PutObject', () => {
    it('creates a new object and returns an ETag', async () => {
      const body = Buffer.from('new object');
      const res = await client.send(
        new PutObjectCommand({ Bucket: BUCKET, Key: 'new.db', Body: body }),
      ) as { ETag: string };

      expect(res.ETag).toMatch(/^"[a-f0-9]{32}"$/);
      expect(existsSync(join(baseDir, 'new.db'))).toBe(true);
    });

    it('creates nested directories as needed', async () => {
      const body = Buffer.from('nested');
      await client.send(
        new PutObjectCommand({ Bucket: BUCKET, Key: 'dbs/abc/test.db', Body: body }),
      );
      expect(existsSync(join(baseDir, 'dbs', 'abc', 'test.db'))).toBe(true);
    });

    it('updates an existing object and returns a new ETag', async () => {
      const body1 = Buffer.from('version 1');
      const res1 = await client.send(
        new PutObjectCommand({ Bucket: BUCKET, Key: 'obj.db', Body: body1 }),
      ) as { ETag: string };

      const body2 = Buffer.from('version 2');
      const res2 = await client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: 'obj.db',
          Body: body2,
          IfMatch: res1.ETag,
        }),
      ) as { ETag: string };

      expect(res2.ETag).not.toBe(res1.ETag);
    });

    it('IfNoneMatch: * succeeds for a new object', async () => {
      const body = Buffer.from('brand new');
      const res = await client.send(
        new PutObjectCommand({ Bucket: BUCKET, Key: 'fresh.db', Body: body, IfNoneMatch: '*' }),
      ) as { ETag: string };

      expect(res.ETag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it('IfNoneMatch: * throws ConditionalRequestConflict when object already exists', async () => {
      const body = Buffer.from('existing');
      await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: 'exists.db', Body: body }));

      await expect(
        client.send(
          new PutObjectCommand({ Bucket: BUCKET, Key: 'exists.db', Body: body, IfNoneMatch: '*' }),
        ),
      ).rejects.toMatchObject({ name: 'ConditionalRequestConflict' });
    });

    it('IfMatch throws PreconditionFailed when ETag does not match', async () => {
      const body = Buffer.from('original');
      await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: 'cond.db', Body: body }));

      await expect(
        client.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: 'cond.db',
            Body: Buffer.from('update'),
            IfMatch: '"wrong-etag"',
          }),
        ),
      ).rejects.toMatchObject({ name: 'PreconditionFailed' });
    });

    it('IfMatch throws PreconditionFailed when object does not exist', async () => {
      await expect(
        client.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: 'nonexistent.db',
            Body: Buffer.from('data'),
            IfMatch: '"some-etag"',
          }),
        ),
      ).rejects.toMatchObject({ name: 'PreconditionFailed' });
    });
  });

  // -------------------------------------------------------------------------
  // ETag determinism
  // -------------------------------------------------------------------------

  it('produces identical ETags for identical content', async () => {
    const body = Buffer.from('deterministic');
    const res1 = await client.send(
      new PutObjectCommand({ Bucket: BUCKET, Key: 'a.db', Body: body }),
    ) as { ETag: string };
    const res2 = await client.send(
      new PutObjectCommand({ Bucket: BUCKET, Key: 'b.db', Body: body }),
    ) as { ETag: string };

    expect(res1.ETag).toBe(res2.ETag);
  });
});
