import { BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { shops } from '../database/schema.js';
import type { DatabaseTransaction } from '../idempotency/idempotency.service.js';

export function isTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function assertBusinessDate(date: string, occurredAt: Date, timezone: string): void {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(occurredAt);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  if (date !== `${get('year')}-${get('month')}-${get('day')}`) {
    throw new BadRequestException({
      code: 'BUSINESS_DATE_MISMATCH',
      message: 'Business date must match the event timestamp in the location timezone.',
    });
  }
}

export async function validateLocationDate(
  tx: DatabaseTransaction,
  shopId: string | null,
  date: string,
  occurredAt: Date,
) {
  // Central operations currently use the business's India timezone.
  let timezone = 'Asia/Kolkata';
  if (shopId) {
    const [shop] = await tx
      .select({ timezone: shops.timezone })
      .from(shops)
      .where(eq(shops.id, shopId));
    if (!shop || !isTimezone(shop.timezone))
      throw new BadRequestException('Shop timezone is not configured correctly.');
    timezone = shop.timezone;
  }
  assertBusinessDate(date, occurredAt, timezone);
}
