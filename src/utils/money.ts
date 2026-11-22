const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'BRL',
  currencyDisplay: 'symbol',
});

export function formatMoney(cents: number): string {
  return moneyFormatter.format(cents / 100);
}
