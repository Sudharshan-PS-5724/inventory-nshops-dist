import { describe, expect, it } from 'vitest';
import { InventoryAvailabilityService } from './inventory-availability.service.js';
import type { DatabaseService } from '../database/database.service.js';

describe('availability regression', () => {
  it('includes products received after opening stock with zero opening grams', async () => {
    const results = [
      [{ shopId: 'shop' }],
      [{ id: 'submission' }],
      [{ productId: 'A', openingGrams: 1000n }],
      [{ productId: 'B', quantityGrams: 5000n }],
      [
        { id: 'A', name: 'Apple', productCode: 'APPLE' },
        { id: 'B', name: 'Banana', productCode: 'BANANA' },
      ],
    ];
    const db = { select: () => ({ from: () => ({ where: async () => results.shift() }) }) };
    const service = new InventoryAvailabilityService({ db } as unknown as DatabaseService);
    const rows = await service.get(
      { userId: 'owner', role: 'ADMIN', assignedShopIds: [] },
      { locationId: '4a43bdc3-a730-4f75-bb54-da0e3314d45d', businessDate: '2026-10-18' },
    );
    expect(rows.find((row) => row.productId === 'B')).toMatchObject({
      openingGrams: '0',
      availableGrams: '5000',
    });
  });
});
