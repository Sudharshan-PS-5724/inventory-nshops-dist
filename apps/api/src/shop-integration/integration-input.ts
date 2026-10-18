import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export const registerMachineSchema = z
  .object({
    shopId: z.uuid(),
    name: z.string().trim().min(1).max(160),
    machineType: z.enum(['DAHUA_TM_A', 'LONGFLY']),
    // An owner-assigned physical asset label, not an IP or an unverified serial query.
    hardwareIdentifier: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9_-]{2,63}$/),
  })
  .strict();

export const masterImportSchema = z
  .object({
    shopId: z.uuid(),
    businessDate: z.iso.date(),
    deviceIds: z.array(z.uuid()).min(1).max(50),
    csv: z.string().min(1).max(250_000),
  })
  .strict()
  .refine((value) => new Set(value.deviceIds).size === value.deviceIds.length, {
    message: 'Select each machine only once.',
  });

export interface MasterRow {
  productCode: string;
  name: string;
  pluCode: string;
  initialPricePaisePerKg: bigint;
  openingGrams: bigint;
  recoveryBasisPoints: number;
}

export const pluMappingSchema = z
  .object({
    deviceId: z.uuid(),
    mappings: z
      .array(
        z
          .object({
            pluCode: z.string().regex(/^\d{1,64}$/),
            productId: z.uuid(),
          })
          .strict(),
      )
      .min(1)
      .max(500),
  })
  .strict()
  .refine(
    (value) => new Set(value.mappings.map((row) => row.pluCode)).size === value.mappings.length,
    'Duplicate PLU in mapping request.',
  );

const headers = [
  'product_code',
  'name',
  'plu',
  'initial_price_per_kg',
  'opening_kg',
  'recovery_percent',
];

/** Bounded CSV reader supporting escaped quotes, BOM, CRLF and quoted commas. */
function csvRecords(input: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [],
    field = '',
    quoted = false,
    closed = false;
  const source = input.replace(/^\uFEFF/, '');
  const pushField = () => {
    record.push(field.trim());
    field = '';
    closed = false;
  };
  const pushRecord = () => {
    pushField();
    if (record.some((value) => value !== '')) records.push(record);
    record = [];
    if (records.length > 501) throw new Error('Maximum 500 product rows.');
  };
  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += char;
    } else if (char === ',') pushField();
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      pushRecord();
    } else if (char === '"') {
      if (field !== '' || closed) throw new Error('Unexpected quote.');
      quoted = true;
    } else {
      if (closed) throw new Error('Unexpected text after closing quote.');
      field += char;
    }
  }
  if (quoted) throw new Error('Unclosed quoted field.');
  if (field !== '' || record.length || closed) pushRecord();
  return records;
}

function decimal(value: string, places: number): bigint {
  if (!new RegExp(`^\\d{1,9}(?:\\.\\d{1,${places}})?$`).test(value)) {
    throw new Error(`Expected a nonnegative decimal with at most ${places} decimal places.`);
  }
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole!) * 10n ** BigInt(places) + BigInt(fraction.padEnd(places, '0'));
}

export function parseMasterCsv(csv: string): MasterRow[] {
  try {
    if (csv.length > 250_000) throw new Error('CSV exceeds 250,000 characters.');
    const records = csvRecords(csv);
    if (records[0]?.join(',') !== headers.join(','))
      throw new Error(`Expected headers: ${headers.join(',')}`);
    if (records.length < 2) throw new Error('At least one product is required.');
    const codes = new Set<string>(),
      plus = new Set<string>();
    return records.slice(1).map((record, index) => {
      try {
        if (record.length !== headers.length) throw new Error('Expected six columns.');
        const [productCode, name, pluCode, price, opening, recovery] = record as [
          string,
          string,
          string,
          string,
          string,
          string,
        ];
        if (!/^[A-Z0-9_-]{1,64}$/.test(productCode))
          throw new Error('Use an uppercase product code.');
        if (!name || name.length > 160) throw new Error('Name must contain 1 to 160 characters.');
        // Preserve leading zeros; do not assume protocol-specific PLU widths here.
        if (!/^\d{1,64}$/.test(pluCode)) throw new Error('PLU must contain 1 to 64 digits.');
        if (codes.has(productCode) || plus.has(pluCode))
          throw new Error('Duplicate product code or PLU.');
        codes.add(productCode);
        plus.add(pluCode);
        const recoveryBasisPoints = Number(decimal(recovery, 2));
        if (recoveryBasisPoints > 10000) throw new Error('Recovery percent exceeds 100.');
        return {
          productCode,
          name,
          pluCode,
          initialPricePaisePerKg: decimal(price, 2),
          openingGrams: decimal(opening, 3),
          recoveryBasisPoints,
        };
      } catch (error) {
        throw new Error(`Product row ${index + 1}: ${(error as Error).message}`);
      }
    });
  } catch (error) {
    throw new BadRequestException({
      code: 'INVALID_MASTER_CSV',
      message: (error as Error).message,
    });
  }
}
