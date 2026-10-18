import { Body, Controller, Get, Headers, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedActor } from '../access/domain/access-policy.js';
import { AuthenticationGuard } from '../auth/authentication.guard.js';
import { CurrentActor } from '../auth/current-actor.decorator.js';
import { ShopIntegrationService } from './shop-integration.service.js';

@ApiTags('shop-integration')
@ApiBearerAuth()
@UseGuards(AuthenticationGuard)
@Controller()
export class ShopIntegrationController {
  constructor(private readonly service: ShopIntegrationService) {}

  @Post('machines')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({
    summary: 'Owner registers a physical machine to one shop. Does not connect hardware.',
  })
  register(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.service.register(actor, key, body);
  }

  @Get('machines')
  @ApiOperation({ summary: 'List registered machines for an authorized shop.' })
  list(@CurrentActor() actor: AuthenticatedActor, @Query('shopId') shopId: string) {
    return this.service.list(actor, shopId);
  }

  @Post('master-imports/preview')
  @ApiOperation({
    summary: 'Validate CSV format without writing. Database conflicts are checked at commit.',
  })
  preview(@CurrentActor() actor: AuthenticatedActor, @Body() body: unknown) {
    return this.service.preview(actor, body);
  }

  @Post('machine-plu-mappings')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({
    summary: 'Add application PLU mappings without changing opening stock or physical hardware.',
  })
  mapPlus(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.service.mapPlus(actor, key, body);
  }

  @Post('master-imports')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({
    summary:
      'Atomically import products, selected machine PLUs and one locked shop opening baseline.',
  })
  importMaster(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.service.importMaster(actor, key, body);
  }
}
