import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { requireAdministrator, type AuthenticatedActor } from '../access/domain/access-policy.js';
import { expenses, inventoryLocations } from '../database/schema.js';
import {
  IdempotencyService,
  type DatabaseTransaction,
} from '../idempotency/idempotency.service.js';
import { requireRecordShopAccess } from '../shops/domain/shop-scope.js';
import {
  recordExpenseInputSchema,
  type RecordExpenseInput,
} from './application/record-expense-input.js';

@Injectable()
export class ExpensesService {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async record(actor: AuthenticatedActor, idempotencyKey: string | undefined, rawInput: unknown) {
    const parsed = recordExpenseInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'INVALID_EXPENSE_INPUT', issues: parsed.error.issues });
    }

    return this.idempotencyService.execute(
      actor.userId,
      'expenses.record',
      idempotencyKey,
      parsed.data,
      (transaction) => this.persistExpense(transaction, actor, parsed.data),
    );
  }

  private async persistExpense(
    transaction: DatabaseTransaction,
    actor: AuthenticatedActor,
    input: RecordExpenseInput,
  ) {
    if (input.locationId === undefined) {
      requireAdministrator(actor);
    } else {
      const [location] = await transaction
        .select({ shopId: inventoryLocations.shopId })
        .from(inventoryLocations)
        .where(eq(inventoryLocations.id, input.locationId));
      if (location === undefined) {
        throw new NotFoundException('Inventory location was not found.');
      }
      if (location.shopId === null) {
        requireAdministrator(actor);
      } else {
        requireRecordShopAccess(actor, { shopId: location.shopId });
      }
    }

    const id = randomUUID();
    const [expense] = await transaction
      .insert(expenses)
      .values({
        id,
        locationId: input.locationId,
        expenseDate: input.expenseDate,
        category: input.category,
        amountPaise: input.amountPaise,
        description: input.description,
        recordedByUserId: actor.userId,
      })
      .returning();
    if (expense === undefined) {
      throw new Error('Expense creation did not return a persisted expense.');
    }
    return { ...expense, amountPaise: expense.amountPaise.toString() };
  }
}
