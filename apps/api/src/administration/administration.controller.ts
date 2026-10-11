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
import { AdministrationService } from './administration.service.js';

@ApiTags('administration')
@ApiBearerAuth()
@UseGuards(AuthenticationGuard)
@Controller()
export class AdministrationController {
  constructor(private readonly administrationService: AdministrationService) {}

  @Post('shops')
  @ApiOperation({ summary: 'Create a shop and its required shop inventory location.' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({ description: 'Shop and location created atomically.' })
  createShop(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.administrationService.createShop(actor, key, body);
  }

  @Post('shop-users')
  @ApiOperation({ summary: 'Register an existing Supabase Auth identity as a shop user.' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({
    description: 'Shop-user profile created; no login identity is created by this endpoint.',
  })
  createShopUser(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.administrationService.createShopUser(actor, key, body);
  }

  @Post('shop-users/:userId/assignments')
  @ApiOperation({ summary: 'Assign a shop user to one active shop.' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({ description: 'Shop assignment recorded.' })
  assignShopUser(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') key: string | undefined,
    @Param('userId') userId: string,
    @Body() body: unknown,
  ) {
    return this.administrationService.assignShopUser(actor, key, userId, body);
  }
}
