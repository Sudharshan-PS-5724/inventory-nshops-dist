export function scaled(value: string, places: number): string {
  if (!new RegExp(`^\\d{1,9}(?:\\.\\d{1,${places}})?$`).test(value)) {
    throw new Error(
      `Enter a nonnegative amount with up to ${places} decimals.`,
    );
  }
  const [whole, fraction = ""] = value.split(".");
  return (
    BigInt(whole) * 10n ** BigInt(places) +
    BigInt(fraction.padEnd(places, "0"))
  ).toString();
}

export function kilograms(grams: string): string {
  const quantity = BigInt(grams);
  const absolute = quantity < 0n ? -quantity : quantity;
  return `${quantity < 0n ? "-" : ""}${absolute / 1000n}.${(absolute % 1000n).toString().padStart(3, "0")}`;
}

export function dateAt(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
