import { Module } from '@nestjs/common';
import { AuthenticationGuard } from './authentication.guard.js';
import { IdentityService } from './identity.service.js';
import { SupabaseTokenVerifierService } from './supabase-token-verifier.service.js';

@Module({
  providers: [SupabaseTokenVerifierService, IdentityService, AuthenticationGuard],
  exports: [SupabaseTokenVerifierService, IdentityService, AuthenticationGuard],
})
export class AuthModule {}
