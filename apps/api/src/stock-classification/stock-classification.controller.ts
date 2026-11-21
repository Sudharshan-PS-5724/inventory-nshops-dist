import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedActor } from '../access/domain/access-policy.js';
import { AuthenticationGuard } from '../auth/authentication.guard.js';
import { CurrentActor } from '../auth/current-actor.decorator.js';
import { StockClassificationService } from './stock-classification.service.js';

@ApiTags('stock-classification')
@ApiBearerAuth()
@UseGuards(AuthenticationGuard)
@Controller('stock-classifications')
export class StockClassificationController {
  constructor(private readonly service: StockClassificationService) {}

  @Post()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({
    summary: 'Move physical quantity from a fresh SKU to its linked discounted SKU.',
  })
  create(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.service.reclassify(actor, key, body);
  }
}
