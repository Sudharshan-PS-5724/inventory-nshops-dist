import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedActor } from '../access/domain/access-policy.js';
import { AuthenticationGuard } from '../auth/authentication.guard.js';
import { CurrentActor } from '../auth/current-actor.decorator.js';
import { InventoryAvailabilityService } from './inventory-availability.service.js';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(AuthenticationGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly availabilityService: InventoryAvailabilityService) {}

  @Get('availability')
  @ApiOperation({ summary: 'Get derived available stock for one location and business date.' })
  @ApiOkResponse({
    description: 'Availability is calculated from physical opening stock and immutable movements.',
  })
  getAvailability(@CurrentActor() actor: AuthenticatedActor, @Query() query: unknown) {
    return this.availabilityService.get(actor, query);
  }
}
