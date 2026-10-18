import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ShopIntegrationController } from './shop-integration.controller.js';
import { ShopIntegrationService } from './shop-integration.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ShopIntegrationController],
  providers: [ShopIntegrationService],
})
export class ShopIntegrationModule {}
