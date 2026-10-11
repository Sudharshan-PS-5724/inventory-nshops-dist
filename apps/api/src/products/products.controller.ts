import { Body, Controller, Headers, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentActor } from '../auth/current-actor.decorator.js';
import { AuthenticationGuard } from '../auth/authentication.guard.js';
import type { AuthenticatedActor } from '../access/domain/access-policy.js';
import { ProductsService } from './products.service.js';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(AuthenticationGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a product and its first administrator-controlled selling price.',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({ description: 'Product and initial price created atomically.' })
  create(
    @CurrentActor() actor: AuthenticatedActor,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.productsService.create(actor, idempotencyKey, body);
  }

  @Post(':productId/prices')
  @ApiOperation({ summary: 'Append an administrator-controlled selling-price history record.' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({ description: 'New price history record created.' })
  changePrice(
    @CurrentActor() actor: AuthenticatedActor,
    @Param('productId') productId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.productsService.changePrice(actor, idempotencyKey, productId, body);
  }
}
