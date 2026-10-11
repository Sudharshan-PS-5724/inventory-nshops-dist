import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const auditColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const roleEnum = pgEnum('role', ['ADMIN', 'SHOP_USER']);
export const locationTypeEnum = pgEnum('location_type', ['CENTRAL', 'SHOP']);
export const movementTypeEnum = pgEnum('movement_type', [
  'PURCHASE_RECEIPT',
  'TRANSFER_OUT',
  'TRANSFER_IN',
  'NORMAL_SALE',
  'RECOVERY_SALE',
  'WASTAGE',
  'ADJUSTMENT',
]);
export const machineEventStatusEnum = pgEnum('machine_event_status', [
  'PENDING_REVIEW',
  'ACCEPTED',
  'QUARANTINED',
  'REJECTED',
]);
export const saleClassificationEnum = pgEnum('sale_classification', ['NORMAL', 'RECOVERY']);
export const transferStatusEnum = pgEnum('transfer_status', ['CONFIRMED', 'CANCELLED']);
export const notificationTypeEnum = pgEnum('notification_type', [
  'LOW_STOCK',
  'COLLECTOR_SYNC_FAILURE',
  'OPENING_STOCK_REMINDER',
  'BACKUP_EXPORT_FAILURE',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    displayName: varchar('display_name', { length: 160 }).notNull(),
    role: roleEnum('role').notNull(),
    active: boolean('active').notNull().default(true),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('users_single_administrator_unique')
      .on(table.role)
      .where(sql`${table.role} = 'ADMIN'`),
  ],
);

export const shops = pgTable('shops', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  timezone: varchar('timezone', { length: 64 }).notNull(),
  active: boolean('active').notNull().default(true),
  ...auditColumns,
});

export const userShopAssignments = pgTable(
  'user_shop_assignments',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    assignedByUserId: uuid('assigned_by_user_id')
      .notNull()
      .references(() => users.id),
  },
  (table) => [primaryKey({ columns: [table.userId, table.shopId] })],
);

export const inventoryLocations = pgTable(
  'inventory_locations',
  {
    id: uuid('id').primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    locationType: locationTypeEnum('location_type').notNull(),
    shopId: uuid('shop_id').references(() => shops.id),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('inventory_locations_shop_unique').on(table.shopId),
    check(
      'inventory_locations_type_shop_consistency',
      sql`(${table.locationType} = 'CENTRAL' AND ${table.shopId} IS NULL) OR (${table.locationType} = 'SHOP' AND ${table.shopId} IS NOT NULL)`,
    ),
  ],
);

export const products = pgTable('products', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  productCode: varchar('product_code', { length: 64 }).notNull().unique(),
  recoveryBasisPoints: bigint('recovery_basis_points', { mode: 'number' }).notNull(),
  active: boolean('active').notNull().default(true),
  ...auditColumns,
});

export const productPrices = pgTable(
  'product_prices',
  {
    id: uuid('id').primaryKey(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    paisePerKg: bigint('paise_per_kg', { mode: 'bigint' }).notNull(),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
    changedByUserId: uuid('changed_by_user_id')
      .notNull()
      .references(() => users.id),
    ...auditColumns,
  },
  (table) => [
    index('product_prices_product_effective_from_index').on(table.productId, table.effectiveFrom),
    check('product_prices_positive_price', sql`${table.paisePerKg} >= 0`),
  ],
);

export const openingStockSubmissions = pgTable(
  'opening_stock_submissions',
  {
    id: uuid('id').primaryKey(),
    locationId: uuid('location_id')
      .notNull()
      .references(() => inventoryLocations.id),
    businessDate: date('business_date').notNull(),
    submittedByUserId: uuid('submitted_by_user_id')
      .notNull()
      .references(() => users.id),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('opening_stock_location_date_unique').on(table.locationId, table.businessDate),
  ],
);

export const openingStockLines = pgTable(
  'opening_stock_lines',
  {
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => openingStockSubmissions.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    quantityGrams: bigint('quantity_grams', { mode: 'bigint' }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.submissionId, table.productId] }),
    check('opening_stock_lines_nonnegative', sql`${table.quantityGrams} >= 0`),
  ],
);

export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuid('id').primaryKey(),
    locationId: uuid('location_id')
      .notNull()
      .references(() => inventoryLocations.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    businessDate: date('business_date').notNull(),
    movementType: movementTypeEnum('movement_type').notNull(),
    quantityGrams: bigint('quantity_grams', { mode: 'bigint' }).notNull(),
    sourceType: varchar('source_type', { length: 64 }).notNull(),
    sourceId: uuid('source_id').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('inventory_movements_source_location_unique').on(
      table.sourceType,
      table.sourceId,
      table.locationId,
      table.productId,
    ),
    index('inventory_movements_availability_index').on(
      table.locationId,
      table.productId,
      table.businessDate,
      table.occurredAt,
    ),
    check('inventory_movements_nonzero', sql`${table.quantityGrams} <> 0`),
  ],
);

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  phone: varchar('phone', { length: 32 }),
  active: boolean('active').notNull().default(true),
  ...auditColumns,
});

export const purchases = pgTable(
  'purchases',
  {
    id: uuid('id').primaryKey(),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => suppliers.id),
    receivingLocationId: uuid('receiving_location_id')
      .notNull()
      .references(() => inventoryLocations.id),
    purchaseDate: date('purchase_date').notNull(),
    recordedByUserId: uuid('recorded_by_user_id')
      .notNull()
      .references(() => users.id),
    notes: text('notes'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }).notNull(),
    ...auditColumns,
  },
  (table) => [index('purchases_supplier_date_index').on(table.supplierId, table.purchaseDate)],
);

export const purchaseItems = pgTable(
  'purchase_items',
  {
    id: uuid('id').primaryKey(),
    purchaseId: uuid('purchase_id')
      .notNull()
      .references(() => purchases.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    quantityGrams: bigint('quantity_grams', { mode: 'bigint' }).notNull(),
    paisePerKg: bigint('paise_per_kg', { mode: 'bigint' }).notNull(),
    lineAmountPaise: bigint('line_amount_paise', { mode: 'bigint' }).notNull(),
  },
  (table) => [
    uniqueIndex('purchase_items_purchase_product_unique').on(table.purchaseId, table.productId),
    check('purchase_items_positive_quantity', sql`${table.quantityGrams} > 0`),
    check('purchase_items_nonnegative_price', sql`${table.paisePerKg} >= 0`),
    check('purchase_items_nonnegative_amount', sql`${table.lineAmountPaise} >= 0`),
  ],
);

export const stockTransfers = pgTable(
  'stock_transfers',
  {
    id: uuid('id').primaryKey(),
    sourceLocationId: uuid('source_location_id')
      .notNull()
      .references(() => inventoryLocations.id),
    destinationLocationId: uuid('destination_location_id')
      .notNull()
      .references(() => inventoryLocations.id),
    status: transferStatusEnum('status').notNull().default('CONFIRMED'),
    initiatedByUserId: uuid('initiated_by_user_id')
      .notNull()
      .references(() => users.id),
    notes: text('notes'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }).notNull(),
    ...auditColumns,
  },
  (table) => [
    check(
      'stock_transfers_distinct_locations',
      sql`${table.sourceLocationId} <> ${table.destinationLocationId}`,
    ),
  ],
);

export const transferItems = pgTable(
  'transfer_items',
  {
    id: uuid('id').primaryKey(),
    transferId: uuid('transfer_id')
      .notNull()
      .references(() => stockTransfers.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    quantityGrams: bigint('quantity_grams', { mode: 'bigint' }).notNull(),
  },
  (table) => [
    uniqueIndex('transfer_items_transfer_product_unique').on(table.transferId, table.productId),
    check('transfer_items_positive_quantity', sql`${table.quantityGrams} > 0`),
  ],
);

export const devices = pgTable(
  'devices',
  {
    id: uuid('id').primaryKey(),
    locationId: uuid('location_id')
      .notNull()
      .references(() => inventoryLocations.id),
    name: varchar('name', { length: 160 }).notNull(),
    machineType: varchar('machine_type', { length: 64 }).notNull(),
    hardwareIdentifier: varchar('hardware_identifier', { length: 128 }).notNull().unique(),
    active: boolean('active').notNull().default(true),
    ...auditColumns,
  },
  (table) => [index('devices_location_active_index').on(table.locationId, table.active)],
);

export const machinePluMappings = pgTable(
  'machine_plu_mappings',
  {
    id: uuid('id').primaryKey(),
    deviceId: uuid('device_id')
      .notNull()
      .references(() => devices.id),
    pluCode: varchar('plu_code', { length: 64 }).notNull(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    active: boolean('active').notNull().default(true),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('machine_plu_mapping_device_plu_unique').on(table.deviceId, table.pluCode),
  ],
);

export const machineSaleEvents = pgTable(
  'machine_sale_events',
  {
    id: uuid('id').primaryKey(),
    deviceId: uuid('device_id')
      .notNull()
      .references(() => devices.id),
    recordEpoch: bigint('record_epoch', { mode: 'number' }).notNull(),
    recordSequence: bigint('record_sequence', { mode: 'number' }).notNull(),
    status: machineEventStatusEnum('status').notNull(),
    rawPayload: text('raw_payload').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    quarantineReason: varchar('quarantine_reason', { length: 128 }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('machine_sale_events_device_epoch_sequence_unique').on(
      table.deviceId,
      table.recordEpoch,
      table.recordSequence,
    ),
    index('machine_sale_events_device_status_received_index').on(
      table.deviceId,
      table.status,
      table.receivedAt,
    ),
  ],
);

export const sales = pgTable(
  'sales',
  {
    id: uuid('id').primaryKey(),
    locationId: uuid('location_id')
      .notNull()
      .references(() => inventoryLocations.id),
    deviceId: uuid('device_id').references(() => devices.id),
    machineEventId: uuid('machine_event_id')
      .references(() => machineSaleEvents.id)
      .unique(),
    classification: saleClassificationEnum('classification').notNull(),
    soldAt: timestamp('sold_at', { withTimezone: true }).notNull(),
    paymentMode: varchar('payment_mode', { length: 32 }).notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    ...auditColumns,
  },
  (table) => [index('sales_location_sold_at_index').on(table.locationId, table.soldAt)],
);

export const saleItems = pgTable(
  'sale_items',
  {
    id: uuid('id').primaryKey(),
    saleId: uuid('sale_id')
      .notNull()
      .references(() => sales.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    machinePluCode: varchar('machine_plu_code', { length: 64 }),
    quantityGrams: bigint('quantity_grams', { mode: 'bigint' }).notNull(),
    unitPricePaisePerKg: bigint('unit_price_paise_per_kg', { mode: 'bigint' }).notNull(),
    lineAmountPaise: bigint('line_amount_paise', { mode: 'bigint' }).notNull(),
    normalPricePaisePerKg: bigint('normal_price_paise_per_kg', { mode: 'bigint' }),
    recoveryBasisPoints: bigint('recovery_basis_points', { mode: 'number' }),
  },
  (table) => [
    check('sale_items_positive_quantity', sql`${table.quantityGrams} > 0`),
    check('sale_items_nonnegative_amount', sql`${table.lineAmountPaise} >= 0`),
  ],
);

export const wastageRecords = pgTable(
  'wastage_records',
  {
    id: uuid('id').primaryKey(),
    locationId: uuid('location_id')
      .notNull()
      .references(() => inventoryLocations.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    quantityGrams: bigint('quantity_grams', { mode: 'bigint' }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    reason: varchar('reason', { length: 320 }),
    recordedByUserId: uuid('recorded_by_user_id')
      .notNull()
      .references(() => users.id),
    ...auditColumns,
  },
  (table) => [check('wastage_records_positive_quantity', sql`${table.quantityGrams} > 0`)],
);

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey(),
    locationId: uuid('location_id').references(() => inventoryLocations.id),
    expenseDate: date('expense_date').notNull(),
    category: varchar('category', { length: 80 }).notNull(),
    amountPaise: bigint('amount_paise', { mode: 'bigint' }).notNull(),
    description: varchar('description', { length: 500 }),
    recordedByUserId: uuid('recorded_by_user_id')
      .notNull()
      .references(() => users.id),
    ...auditColumns,
  },
  (table) => [check('expenses_nonnegative_amount', sql`${table.amountPaise} >= 0`)],
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey(),
    actorId: uuid('actor_id').notNull(),
    operation: varchar('operation', { length: 96 }).notNull(),
    key: varchar('key', { length: 255 }).notNull(),
    requestFingerprint: varchar('request_fingerprint', { length: 128 }).notNull(),
    responseStatus: bigint('response_status', { mode: 'number' }).notNull(),
    responseBody: text('response_body').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('idempotency_keys_actor_operation_key_unique').on(
      table.actorId,
      table.operation,
      table.key,
    ),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey(),
    actorId: uuid('actor_id').references(() => users.id),
    action: varchar('action', { length: 96 }).notNull(),
    entityType: varchar('entity_type', { length: 96 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    detail: text('detail'),
  },
  (table) => [
    index('audit_logs_entity_occurred_index').on(
      table.entityType,
      table.entityId,
      table.occurredAt,
    ),
  ],
);

export const notificationSettings = pgTable('notification_settings', {
  id: uuid('id').primaryKey(),
  ownerUserId: uuid('owner_user_id')
    .notNull()
    .references(() => users.id)
    .unique(),
  lowStockEnabled: boolean('low_stock_enabled').notNull().default(true),
  syncFailureEnabled: boolean('sync_failure_enabled').notNull().default(true),
  ...auditColumns,
});

export const pushDevices = pgTable(
  'push_devices',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    fcmToken: varchar('fcm_token', { length: 512 }).notNull().unique(),
    platform: varchar('platform', { length: 24 }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [index('push_devices_user_active_index').on(table.userId, table.revokedAt)],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    locationId: uuid('location_id').references(() => inventoryLocations.id),
    type: notificationTypeEnum('type').notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    body: varchar('body', { length: 500 }).notNull(),
    data: text('data').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    index('notifications_user_read_created_index').on(table.userId, table.readAt, table.createdAt),
  ],
);
