import { describe, expect, it } from 'vitest';
import {
  masterImportSchema,
  parseMasterCsv,
  registerMachineSchema,
  pluMappingSchema,
} from './integration-input.js';

const header = 'product_code,name,plu,initial_price_per_kg,opening_kg,recovery_percent\n';
const row = 'TOMATO,Tomato,0001,35.50,12.125,40';
describe('master CSV', () => {
  it('converts kilograms and rupees exactly and preserves PLU zeros', () => {
    expect(parseMasterCsv(header + row)[0]).toEqual({
      productCode: 'TOMATO',
      name: 'Tomato',
      pluCode: '0001',
      initialPricePaisePerKg: 3550n,
      openingGrams: 12125n,
      recoveryBasisPoints: 4000,
    });
  });
  it('supports BOM, CRLF, commas and escaped quotes', () => {
    expect(
      parseMasterCsv(
        '\uFEFF' + header.replace('\n', '\r\n') + 'APPLE,"Apple, ""Royal""",2,0,0,0\r\n',
      )[0]?.name,
    ).toBe('Apple, "Royal"');
  });
  it.each([
    row + '\n' + row,
    row + '\nAPPLE,Apple,0001,10,2,20',
    'TOMATO,Tomato,1,35.001,12,40',
    'TOMATO,Tomato,1,35,12.0001,40',
    'TOMATO,Tomato,1,35,-1,40',
    'TOMATO,Tomato,1,35,1,101',
    'TOMATO,Tomato,1,1e3,1,40',
    'TOMATO,"Tomato,1,35,1,40',
    'TOMATO,"Tomato"x,1,35,1,40',
  ])('rejects invalid or ambiguous rows: %s', (value) => {
    expect(() => parseMasterCsv(header + value)).toThrow();
  });
  it('rejects incorrect headers and empty data', () => {
    expect(() => parseMasterCsv(row)).toThrow();
    expect(() => parseMasterCsv(header)).toThrow();
  });
  it('requires at least one machine so PLUs are actually persisted', () => {
    expect(
      masterImportSchema.safeParse({
        shopId: 'c68836b8-4ed7-4269-a813-ab1be6eafd35',
        businessDate: '2026-10-18',
        deviceIds: [],
        csv: header + row,
      }).success,
    ).toBe(false);
  });
});

describe('machine registration', () => {
  const base = {
    shopId: 'c68836b8-4ed7-4269-a813-ab1be6eafd35',
    name: 'Counter 1',
    machineType: 'DAHUA_TM_A',
  };
  it('normalizes a permanent asset label', () => {
    expect(
      registerMachineSchema.parse({ ...base, hardwareIdentifier: ' shop01-scale01 ' })
        .hardwareIdentifier,
    ).toBe('SHOP01-SCALE01');
  });
  it('does not use an IP as machine identity', () => {
    expect(
      registerMachineSchema.safeParse({ ...base, hardwareIdentifier: '192.168.1.10' }).success,
    ).toBe(false);
  });
});

describe('standalone PLU mapping', () => {
  const deviceId = 'c68836b8-4ed7-4269-a813-ab1be6eafd35';
  const mapping = { pluCode: '0001', productId: deviceId };
  it('requires no opening-stock or business-date fields', () => {
    expect(pluMappingSchema.parse({ deviceId, mappings: [mapping] }).mappings[0]?.pluCode).toBe(
      '0001',
    );
  });
  it('rejects duplicate PLUs before persistence', () => {
    expect(pluMappingSchema.safeParse({ deviceId, mappings: [mapping, mapping] }).success).toBe(
      false,
    );
  });
});
