import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedActor } from '../access/domain/access-policy.js';
import { AuthenticationGuard } from '../auth/authentication.guard.js';
import { CurrentActor } from '../auth/current-actor.decorator.js';
import { PurchasesService } from './purchases.service.js';

@ApiTags('suppliers', 'purchases')
@ApiBearerAuth()
@UseGuards(AuthenticationGuard)
@Controller()
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post('suppliers')
  @ApiOperation({ summary: 'Create an active supplier for centralized purchasing.' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({ description: 'Supplier created.' })
  createSupplier(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.purchasesService.createSupplier(actor, idempotencyKey, body);
  }

  @Post('purchases')
  @ApiOperation({
    summary: 'Confirm a centralized purchase and add its quantities to the inventory ledger.',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({ description: 'Purchase and receipt movements were recorded atomically.' })
  createPurchase(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.purchasesService.createPurchase(actor, idempotencyKey, body);
  }
}
