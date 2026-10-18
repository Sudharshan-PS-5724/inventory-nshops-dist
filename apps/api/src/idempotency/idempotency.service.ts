import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import { idempotencyKeys, auditLogs } from '../database/schema.js';

export type DatabaseTransaction = Parameters<
  Parameters<DatabaseService['db']['transaction']>[0]
>[0];

export function canonicalizeForIdempotency(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new BadRequestException('Request contains a non-finite number.');
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'bigint') {
    return JSON.stringify({ $bigint: value.toString() });
  }
  if (value instanceof Date) {
    return JSON.stringify({ $date: value.toISOString() });
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeForIdempotency).join(',')}]`;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => `${JSON.stringify(key)}:${canonicalizeForIdempotency(record[key])}`)
      .join(',')}}`;
  }
  throw new BadRequestException('Request contains an unsupported value.');
}

function requestFingerprint(value: unknown): string {
  return createHash('sha256').update(canonicalizeForIdempotency(value)).digest('hex');
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly databaseService: DatabaseService) {}

  async execute<T extends object>(
    actorId: string,
    operation: string,
    key: string | undefined,
    request: unknown,
    work: (transaction: DatabaseTransaction) => Promise<T>,
  ): Promise<T> {
    if (key === undefined || key.trim().length === 0 || key.length > 255) {
      throw new BadRequestException('A valid Idempotency-Key header is required.');
    }

    const fingerprint = requestFingerprint(request);
    return this.databaseService.db.transaction(async (transaction) => {
      const recordId = randomUUID();
      const inserted = await transaction
        .insert(idempotencyKeys)
        .values({
          id: recordId,
          actorId,
          operation,
          key,
          requestFingerprint: fingerprint,
          responseStatus: 0,
          responseBody: '',
          expiresAt: new Date(Date.now() + 86_400_000),
        })
        .onConflictDoNothing()
        .returning({ id: idempotencyKeys.id });

      if (inserted.length === 0) {
        const [existing] = await transaction
          .select({
            requestFingerprint: idempotencyKeys.requestFingerprint,
            responseBody: idempotencyKeys.responseBody,
          })
          .from(idempotencyKeys)
          .where(
            and(
              eq(idempotencyKeys.actorId, actorId),
              eq(idempotencyKeys.operation, operation),
              eq(idempotencyKeys.key, key),
            ),
          );
        if (existing === undefined) {
          throw new ConflictException(
            'Idempotency key is concurrently being processed; retry the request.',
          );
        }
        if (existing.requestFingerprint !== fingerprint) {
          throw new ConflictException('Idempotency key was already used with a different request.');
        }
        return JSON.parse(existing.responseBody) as T;
      }

      const response = await work(transaction);
      const normalizedResponse = JSON.parse(JSON.stringify(response)) as T;
      await transaction.insert(auditLogs).values({
        id: randomUUID(),
        actorId,
        action: operation,
        entityType: 'IDEMPOTENT_OPERATION',
        entityId: recordId,
        detail: JSON.stringify({ requestFingerprint: fingerprint, response: normalizedResponse }),
      });
      await transaction
        .update(idempotencyKeys)
        .set({ responseStatus: 201, responseBody: JSON.stringify(normalizedResponse) })
        .where(eq(idempotencyKeys.id, recordId));
      return normalizedResponse;
    });
  }
}
