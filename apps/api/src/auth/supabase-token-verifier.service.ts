import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Environment } from '../config/environment.js';

export interface VerifiedSupabaseIdentity {
  readonly subject: string;
  readonly claims: JWTPayload;
}

@Injectable()
export class SupabaseTokenVerifierService {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly configService: ConfigService<Environment, true>) {
    this.jwks = createRemoteJWKSet(
      new URL(configService.get('SUPABASE_JWKS_URL', { infer: true })),
    );
  }

  async verifyBearerToken(
    authorizationHeader: string | undefined,
  ): Promise<VerifiedSupabaseIdentity> {
    if (authorizationHeader === undefined || !authorizationHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('A bearer token is required.');
    }

    const token = authorizationHeader.slice('Bearer '.length).trim();
    if (token.length === 0) {
      throw new UnauthorizedException('A bearer token is required.');
    }

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.configService.get('SUPABASE_JWT_ISSUER', { infer: true }),
        audience: this.configService.get('SUPABASE_JWT_AUDIENCE', { infer: true }),
      });
      if (payload.sub === undefined || payload.sub.length === 0) {
        throw new UnauthorizedException('Token subject is missing.');
      }
      return { subject: payload.sub, claims: payload };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Bearer token verification failed.');
    }
  }
}
