export interface TransferLockInput {
  readonly locationId: string;
  readonly productId: string;
  readonly businessDate: string;
}

/** Stable order is mandatory before acquiring multiple transaction locks. */
export function sortedTransferLockKeys(inputs: readonly TransferLockInput[]): string[] {
  return inputs
    .map((input) => `${input.locationId}:${input.productId}:${input.businessDate}`)
    .sort((left, right) => left.localeCompare(right));
}
