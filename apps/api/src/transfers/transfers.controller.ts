import { Body, Controller, Headers, Param, Post, UseGuards } from '@nestjs/common';
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
import { TransfersService } from './transfers.service.js';

@ApiTags('transfers')
@ApiBearerAuth()
@UseGuards(AuthenticationGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ApiOperation({
    summary:
      'Confirm an administrator-authorized stock transfer and write paired ledger movements.',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({ description: 'Transfer and its paired inventory movements were recorded.' })
  create(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.transfersService.create(actor, idempotencyKey, body);
  }

  @Post('dispatch')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Dispatch stock, deducting only the source inventory.' })
  dispatch(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.transfersService.dispatch(actor, key, body);
  }

  @Post(':transferId/receipt')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({
    summary: 'Record physical receipt and add only received quantity to the destination.',
  })
  receipt(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') key: string | undefined,
    @Param('transferId') transferId: string,
    @Body() body: unknown,
  ) {
    return this.transfersService.receive(actor, key, transferId, body);
  }

  @Post(':transferId/approve-discrepancy')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({
    summary: 'Close a reviewed transfer discrepancy without changing historic quantities.',
  })
  approveDiscrepancy(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') key: string | undefined,
    @Param('transferId') transferId: string,
  ) {
    return this.transfersService.approveDiscrepancy(actor, key, transferId);
  }
}
