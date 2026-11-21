import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedActor } from '../access/domain/access-policy.js';
import { AuthenticationGuard } from '../auth/authentication.guard.js';
import { CurrentActor } from '../auth/current-actor.decorator.js';
import { StockRequirementsService } from './stock-requirements.service.js';

@ApiTags('stock-requirements')
@ApiBearerAuth()
@UseGuards(AuthenticationGuard)
@Controller('stock-requirements')
export class StockRequirementsController {
  constructor(private readonly service: StockRequirementsService) {}

  @Get()
  @ApiOperation({ summary: 'List stock requirements visible to the authenticated actor.' })
  list(@CurrentActor() actor: AuthenticatedActor, @Query('shopId') shopId?: string) {
    return this.service.list(actor, shopId);
  }

  @Post()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Submit a shop stock requirement without changing inventory.' })
  create(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.service.create(actor, key, body);
  }

  @Post(':requirementId/review')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Approve, partly approve, or reject a requested stock requirement.' })
  review(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') key: string | undefined,
    @Param('requirementId') requirementId: string,
    @Body() body: unknown,
  ) {
    return this.service.review(actor, key, requirementId, body);
  }
}
