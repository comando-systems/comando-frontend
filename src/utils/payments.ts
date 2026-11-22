import type { PaymentInput, PaymentMethod } from '@/types';

export interface PaymentDraftRow {
  readonly id: string;
  readonly method: PaymentMethod;
  readonly amountCents: string;
  readonly receivedCents: string;
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  DEBIT_CARD: 'Debit card',
  CREDIT_CARD: 'Credit card',
  PIX: 'Pix',
  OTHER: 'Other',
};

let nextPaymentRowId = 0;

export function createPaymentRow(overrides: Partial<PaymentDraftRow> = {}): PaymentDraftRow {
  nextPaymentRowId += 1;

  return {
    id: `payment-row-${nextPaymentRowId}`,
    method: 'CASH',
    amountCents: '',
    receivedCents: '',
    ...overrides,
  };
}

export function parseWholeCents(value: string): number | null {
  const normalized = value.trim();

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  return Number.isSafeInteger(amount) ? amount : null;
}

export function paymentDraftTotalCents(rows: readonly PaymentDraftRow[]): number {
  return rows.reduce((sum, row) => sum + (parseWholeCents(row.amountCents) ?? 0), 0);
}

export function paymentInputsFromRows(rows: readonly PaymentDraftRow[]): PaymentInput[] {
  const inputs: PaymentInput[] = [];

  for (const row of rows) {
    const amountCents = parseWholeCents(row.amountCents);

    if (amountCents === null || amountCents <= 0) {
      continue;
    }

    if (row.method !== 'CASH') {
      inputs.push({ method: row.method, amountCents });
      continue;
    }

    const receivedCents = parseWholeCents(row.receivedCents);

    if (receivedCents === null || receivedCents <= 0) {
      inputs.push({ method: 'CASH', amountCents });
      continue;
    }

    inputs.push({ method: 'CASH', amountCents, receivedCents });
  }

  return inputs;
}

export function validatePaymentRows(
  rows: readonly PaymentDraftRow[],
  totalCents: number,
): string | null {
  if (rows.length === 0) {
    return 'Add at least one payment.';
  }

  for (const row of rows) {
    const amountCents = parseWholeCents(row.amountCents);

    if (amountCents === null || amountCents <= 0) {
      return 'Every payment needs a positive amount in cents.';
    }

    if (row.method !== 'CASH' && row.receivedCents.trim().length > 0) {
      return 'Only cash payments can record an amount received.';
    }

    if (row.method === 'CASH' && row.receivedCents.trim().length > 0) {
      const receivedCents = parseWholeCents(row.receivedCents);

      if (receivedCents === null || receivedCents <= 0) {
        return 'Cash received must be a positive amount in cents.';
      }

      if (receivedCents < amountCents) {
        return 'Amount received cannot be less than the payment amount.';
      }
    }
  }

  return paymentDraftTotalCents(rows) === totalCents
    ? null
    : 'Payment amounts must equal the order total.';
}
