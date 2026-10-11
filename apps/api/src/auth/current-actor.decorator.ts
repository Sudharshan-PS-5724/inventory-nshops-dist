import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedActor } from '../access/domain/access-policy.js';
import type { AuthenticatedRequest } from './authentication.guard.js';

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedActor => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.actor === undefined) {
      throw new UnauthorizedException('Authenticated actor context is missing.');
    }
    return request.actor;
  },
);
