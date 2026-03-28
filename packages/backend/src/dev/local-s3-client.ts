/**
 * Filesystem-backed S3 client for local development.
 *
 * Implements the three S3 operations used by `S3SQLiteDB` — GetObject,
 * PutObject, and HeadObject — backed by files under a configurable base
 * directory (defaults to `./local-data`).
 *
 * ETags are computed as MD5 of the object body and persisted in a JSON
 * sidecar file (`<key>.meta`) alongside each object so they survive restarts.
 *
 * Conditional write semantics (IfMatch / IfNoneMatch) match real S3 behaviour
 * so the `ETagMismatchError` crash-recovery path in `S3SQLiteDB` works locally.
 *
 * Usage:
 *   const client = new LocalFileS3Client('./local-data');
 *   const db = await S3SQLiteDB.open({
 *     s3: client as unknown as S3Client,
 *     bucket: 'local',
 *     ...
 *   });
 */

import {
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, normalize } from 'node:path';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface MetaSidecar {
  etag: string;
  contentType: string;
}

type AnyCommand = GetObjectCommand | PutObjectCommand | HeadObjectCommand;

// ---------------------------------------------------------------------------
// LocalFileS3Client
// ---------------------------------------------------------------------------

export class LocalFileS3Client {
  private readonly baseDir: string;

  constructor(baseDir = './local-data') {
    this.baseDir = normalize(baseDir);
  }

  /** Duck-typed send() — accepts the same command objects as S3Client. */
  async send(command: AnyCommand): Promise<unknown> {
    if (command instanceof GetObjectCommand) return this._get(command);
    if (command instanceof PutObjectCommand) return this._put(command);
    if (command instanceof HeadObjectCommand) return this._head(command);
    throw new Error(
      `LocalFileS3Client: unsupported command ${(command as { constructor: { name: string } }).constructor.name}`,
    );
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private _objectPath(key: string): string {
    return join(this.baseDir, key);
  }

  private _metaPath(key: string): string {
    return `${this._objectPath(key)}.meta`;
  }

  private _readMeta(key: string): MetaSidecar | null {
    const metaPath = this._metaPath(key);
    if (!existsSync(metaPath)) return null;
    try {
      return JSON.parse(readFileSync(metaPath, 'utf8')) as MetaSidecar;
    } catch {
      return null;
    }
  }

  private _writeMeta(key: string, meta: MetaSidecar): void {
    writeFileSync(this._metaPath(key), JSON.stringify(meta));
  }

  private _etag(body: Buffer): string {
    return `"${createHash('md5').update(body).digest('hex')}"`;
  }

  private _noSuchKey(key: string): Error {
    return Object.assign(new Error(`No such key: ${key}`), {
      name: 'NoSuchKey',
      $metadata: { httpStatusCode: 404 },
    });
  }

  private _get(cmd: GetObjectCommand): unknown {
    const { Key } = cmd.input;
    const objPath = this._objectPath(Key!);
    const meta = this._readMeta(Key!);

    if (!existsSync(objPath) || !meta) {
      throw this._noSuchKey(Key!);
    }

    const content = readFileSync(objPath);

    // Return a body with transformToByteArray() — the only method S3SQLiteDB calls.
    const body = {
      transformToByteArray: async (): Promise<Uint8Array> =>
        new Uint8Array(content),
    };

    return { Body: body, ETag: meta.etag, ContentLength: content.length };
  }

  private _put(cmd: PutObjectCommand): unknown {
    const { Key, Body, ContentType, IfMatch, IfNoneMatch } = cmd.input;
    const meta = this._readMeta(Key!);
    const objPath = this._objectPath(Key!);
    const exists = existsSync(objPath) && meta !== null;

    // IfNoneMatch: * → fail if object already exists
    if (IfNoneMatch === '*' && exists) {
      throw Object.assign(
        new Error(`ConditionalRequestConflict: object already exists at ${Key}`),
        { name: 'ConditionalRequestConflict', $metadata: { httpStatusCode: 412 } },
      );
    }

    // IfMatch: <etag> → fail if ETag doesn't match current object
    if (IfMatch !== undefined) {
      if (!exists || meta!.etag !== IfMatch) {
        throw Object.assign(
          new Error(
            `PreconditionFailed: ETag mismatch for ${Key}. ` +
              `Expected ${IfMatch}, got ${meta?.etag ?? '(none)'}`,
          ),
          { name: 'PreconditionFailed', $metadata: { httpStatusCode: 412 } },
        );
      }
    }

    const bodyBuf = Buffer.isBuffer(Body)
      ? Body
      : Buffer.from(Body as Uint8Array);

    const etag = this._etag(bodyBuf);

    // Ensure the directory exists before writing.
    const dir = dirname(objPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(objPath, bodyBuf);
    this._writeMeta(Key!, {
      etag,
      contentType: ContentType ?? 'application/octet-stream',
    });

    return { ETag: etag, $metadata: { httpStatusCode: 200 } };
  }

  private _head(cmd: HeadObjectCommand): unknown {
    const { Key } = cmd.input;
    const objPath = this._objectPath(Key!);
    const meta = this._readMeta(Key!);

    if (!existsSync(objPath) || !meta) {
      throw this._noSuchKey(Key!);
    }

    const content = readFileSync(objPath);
    return { ETag: meta.etag, ContentLength: content.length };
  }
}
