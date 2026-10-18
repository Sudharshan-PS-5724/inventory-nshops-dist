import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AccessDeniedFilter } from './access/access-denied.filter.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { validateEnvironment } from './config/environment.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { ProductsModule } from './products/products.module.js';
import { OpeningStockModule } from './opening-stock/opening-stock.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { IdempotencyModule } from './idempotency/idempotency.module.js';
import { TransfersModule } from './transfers/transfers.module.js';
import { PurchasesModule } from './purchases/purchases.module.js';
import { WastageModule } from './wastage/wastage.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { AdministrationModule } from './administration/administration.module.js';
import { RecoverySalesModule } from './recovery-sales/recovery-sales.module.js';
import { ShopIntegrationModule } from './shop-integration/shop-integration.module.js';

@Module({
  providers: [{ provide: APP_FILTER, useClass: AccessDeniedFilter }],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    AuthModule,
    DatabaseModule,
    IdempotencyModule,
    HealthModule,
    OpeningStockModule,
    InventoryModule,
    ProductsModule,
    TransfersModule,
    PurchasesModule,
    WastageModule,
    ExpensesModule,
    AdministrationModule,
    RecoverySalesModule,
    ShopIntegrationModule,
    CatalogModule,
  ],
})
export class AppModule {}
