import { Injectable, UnauthorizedException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { AuthenticatedActor } from '../access/domain/access-policy.js';
import { DatabaseService } from '../database/database.service.js';
import { userShopAssignments, users } from '../database/schema.js';

@Injectable()
export class IdentityService {
  constructor(private readonly databaseService: DatabaseService) {}

  async resolveActiveActor(userId: string): Promise<AuthenticatedActor> {
    const rows = await this.databaseService.db
      .select({ role: users.role, shopId: userShopAssignments.shopId })
      .from(users)
      .leftJoin(userShopAssignments, eq(userShopAssignments.userId, users.id))
      .where(and(eq(users.id, userId), eq(users.active, true)));

    const first = rows[0];
    if (first === undefined) {
      throw new UnauthorizedException(
        'No active application user matches this authentication identity.',
      );
    }

    return {
      userId,
      role: first.role,
      assignedShopIds: rows.flatMap((row) => (row.shopId === null ? [] : [row.shopId])),
    };
  }
}
