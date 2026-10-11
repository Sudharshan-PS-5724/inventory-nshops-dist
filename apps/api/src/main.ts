import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyHelmet from '@fastify/helmet';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  );

  await app.register(fastifyHelmet, { contentSecurityPolicy: false });
  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin === undefined) {
    throw new Error('CORS_ORIGIN must be configured before API startup.');
  }
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  });
  app.setGlobalPrefix('api/v1');

  const openApiConfig = new DocumentBuilder()
    .setTitle('Multi-Shop Inventory API')
    .setVersion('0.1.0')
    .setDescription('Authoritative API for inventory, scale ingestion, and operations.')
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/openapi.json' });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ host: '0.0.0.0', port });
  Logger.log(`API listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
