import 'reflect-metadata';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { UnauthorizedException } from '@nestjs/common';

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/unused',
  CORS_ORIGIN: 'http://localhost:8081',
  SUPABASE_JWT_ISSUER: 'https://example.invalid/auth/v1',
  SUPABASE_JWKS_URL: 'https://example.invalid/auth/v1/.well-known/jwks.json',
  SENTRY_DSN: '',
});
const { AppModule } = await import('../dist/app.module.js');
const { DatabaseService } = await import('../dist/database/database.service.js');
const { SupabaseTokenVerifierService } =
  await import('../dist/auth/supabase-token-verifier.service.js');
const { IdentityService } = await import('../dist/auth/identity.service.js');
const { ProductsService } = await import('../dist/products/products.service.js');
let app;
let databaseReady = true;
before(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DatabaseService)
    .useValue({
      checkConnectivity: async () => {
        if (!databaseReady) throw new Error('offline');
      },
      db: {},
    })
    .overrideProvider(SupabaseTokenVerifierService)
    .useValue({
      verifyBearerToken: async (value) => {
        if (!['Bearer owner', 'Bearer shop'].includes(value)) throw new UnauthorizedException();
        return { subject: value.slice(7) };
      },
    })
    .overrideProvider(IdentityService)
    .useValue({
      resolveActiveActor: async (id) => ({
        userId: 'c68836b8-4ed7-4269-a813-ab1be6eafd35',
        role: id === 'owner' ? 'ADMIN' : 'SHOP_USER',
        assignedShopIds: [],
      }),
    })
    .compile();
  app = module.createNestApplication(new FastifyAdapter(), { logger: false });
  app.setGlobalPrefix('api/v1');
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});
after(async () => {
  await app?.close();
});
const request = (options) => app.getHttpAdapter().getInstance().inject(options);

test('compiled services preserve injection metadata and resolve dependencies', () => {
  assert.equal(
    Reflect.getMetadata('design:paramtypes', ProductsService)[0].name,
    'IdempotencyService',
  );
  assert.ok(app.get(ProductsService).idempotencyService);
});
test('health endpoints work without listening on a network socket', async () => {
  assert.equal((await request({ url: '/api/v1/health/live' })).statusCode, 200);
  assert.equal((await request({ url: '/api/v1/health/ready' })).statusCode, 200);
  databaseReady = false;
  assert.equal((await request({ url: '/api/v1/health/ready' })).statusCode, 503);
  databaseReady = true;
});
test('unauthenticated requests receive 401', async () => {
  assert.equal((await request({ url: '/api/v1/identity' })).statusCode, 401);
});
test('owner-only mutations and cross-shop reads return 403, not 500', async () => {
  for (const url of [
    '/api/v1/shops',
    '/api/v1/machines',
    '/api/v1/machine-plu-mappings',
    '/api/v1/master-imports',
  ]) {
    const reply = await request({
      method: 'POST',
      url,
      headers: { authorization: 'Bearer shop' },
      payload: {},
    });
    assert.equal(reply.statusCode, 403, url);
    assert.equal(reply.json().code, 'ACCESS_DENIED');
  }
  assert.equal(
    (
      await request({
        url: '/api/v1/machines?shopId=c68836b8-4ed7-4269-a813-ab1be6eafd35',
        headers: { authorization: 'Bearer shop' },
      })
    ).statusCode,
    403,
  );
});
test('invalid product codes return 400 without reaching the database', async () => {
  const reply = await request({
    method: 'POST',
    url: '/api/v1/products',
    headers: { authorization: 'Bearer owner' },
    payload: {
      name: 'Apple',
      productCode: 'bad code',
      recoveryBasisPoints: 1000,
      initialPricePaisePerKg: '100',
    },
  });
  assert.equal(reply.statusCode, 400);
});
