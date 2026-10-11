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
import { WastageService } from './wastage.service.js';

@ApiTags('wastage')
@ApiBearerAuth()
@UseGuards(AuthenticationGuard)
@Controller('wastage')
export class WastageController {
  constructor(private readonly wastageService: WastageService) {}

  @Post()
  @ApiOperation({ summary: 'Record authorized wastage and deduct it from the location ledger.' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({ description: 'Wastage and its inventory movement were recorded.' })
  record(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.wastageService.record(actor, idempotencyKey, body);
  }
}
