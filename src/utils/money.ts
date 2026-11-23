const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'BRL',
  currencyDisplay: 'symbol',
});

export function formatMoney(cents: number): string {
  return moneyFormatter.format(cents / 100);
}

const MAX_SAFE_CENTS = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Converts a decimal amount to integer cents using string arithmetic only.
 * A dot or comma is accepted as the decimal separator; thousands separators are not.
 */
export function parsePriceToCents(input: string): number | null {
  const normalized = input.trim().replace(',', '.');

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [whole, fraction = ''] = normalized.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));

  return cents > MAX_SAFE_CENTS ? null : Number(cents);
}

export function formatPriceInput(cents: number): string {
  const amount = BigInt(cents);
  return `${amount / 100n}.${String(amount % 100n).padStart(2, '0')}`;
}
