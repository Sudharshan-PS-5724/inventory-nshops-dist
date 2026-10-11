import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import type { Environment } from '../config/environment.js';
import * as schema from './schema.js';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  readonly client: Sql;
  readonly db: PostgresJsDatabase<typeof schema>;

  constructor(configService: ConfigService<Environment, true>) {
    this.client = postgres(configService.get('DATABASE_URL', { infer: true }), {
      max: configService.get('DATABASE_POOL_MAX', { infer: true }),
      idle_timeout: 20,
      prepare: false,
    });
    this.db = drizzle({ client: this.client, schema });
  }

  async checkConnectivity(): Promise<void> {
    await this.client`select 1`;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.end({ timeout: 5 });
  }
}
