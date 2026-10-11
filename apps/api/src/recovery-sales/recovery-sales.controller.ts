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
import { RecoverySalesService } from './recovery-sales.service.js';

@ApiTags('recovery-sales')
@ApiBearerAuth()
@UseGuards(AuthenticationGuard)
@Controller('recovery-sales')
export class RecoverySalesController {
  constructor(private readonly recoverySalesService: RecoverySalesService) {}

  @Post()
  @ApiOperation({
    summary: 'Record a recovery sale at the product recovery price and deduct stock.',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({
    description: 'Recovery sale, price snapshots, and ledger movements recorded atomically.',
  })
  record(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.recoverySalesService.record(actor, key, body);
  }
}
