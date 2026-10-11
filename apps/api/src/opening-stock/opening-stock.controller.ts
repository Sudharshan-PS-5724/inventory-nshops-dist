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
import { OpeningStockService } from './opening-stock.service.js';

@ApiTags('opening-stock')
@ApiBearerAuth()
@UseGuards(AuthenticationGuard)
@Controller('opening-stock/submissions')
export class OpeningStockController {
  constructor(private readonly openingStockService: OpeningStockService) {}

  @Post()
  @ApiOperation({
    summary: 'Submit one locked physical opening-stock baseline for a location/date.',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({ description: 'Opening stock was recorded and locked.' })
  submit(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.openingStockService.submit(actor, idempotencyKey, body);
  }
}
