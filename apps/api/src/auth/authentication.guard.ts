import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { IdentityService } from './identity.service.js';
import { SupabaseTokenVerifierService } from './supabase-token-verifier.service.js';

export interface AuthenticatedRequest extends FastifyRequest {
  actor?: Awaited<ReturnType<IdentityService['resolveActiveActor']>>;
}

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly tokenVerifier: SupabaseTokenVerifierService,
    private readonly identityService: IdentityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const identity = await this.tokenVerifier.verifyBearerToken(request.headers.authorization);
    request.actor = await this.identityService.resolveActiveActor(identity.subject);
    return true;
  }
}
