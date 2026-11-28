import { getErrorMessage } from '@/services/api';
import { parsePriceToCents } from '@/utils/money';
import type { PaymentInput, PaymentMethod } from '@/types';

export interface PaymentDraftRow {
  readonly id: string;
  readonly method: PaymentMethod;
  /**
   * Integer-cents string (for example "1250"). The editor displays it as reais
   * with two decimals and converts typed amounts back with parsePriceToCents.
   */
  readonly amountCents: string;
  readonly receivedCents: string;
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Dinheiro',
  DEBIT_CARD: 'Cartão de débito',
  CREDIT_CARD: 'Cartão de crédito',
  PIX: 'Pix',
  OTHER: 'Outro',
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

/**
 * Parses a draft amount into integer cents. Rows normally hold an integer-cents
 * string; decimal reais text (for example "12.50") is accepted as well so rows
 * initialized from a decimal input keep working.
 */
export function parseDraftCents(value: string): number | null {
  const trimmed = value.trim();

  if (/^\d+$/.test(trimmed)) {
    const cents = Number(trimmed);
    return Number.isSafeInteger(cents) ? cents : null;
  }

  return parsePriceToCents(trimmed);
}

export function paymentDraftTotalCents(rows: readonly PaymentDraftRow[]): number {
  return rows.reduce((sum, row) => sum + (parseDraftCents(row.amountCents) ?? 0), 0);
}

export function paymentInputsFromRows(rows: readonly PaymentDraftRow[]): PaymentInput[] {
  const inputs: PaymentInput[] = [];

  for (const row of rows) {
    const amountCents = parseDraftCents(row.amountCents);

    if (amountCents === null || amountCents <= 0) {
      continue;
    }

    if (row.method !== 'CASH') {
      inputs.push({ method: row.method, amountCents });
      continue;
    }

    const receivedCents = parseDraftCents(row.receivedCents);

    if (receivedCents === null || receivedCents <= 0) {
      inputs.push({ method: 'CASH', amountCents });
      continue;
    }

    inputs.push({ method: 'CASH', amountCents, receivedCents });
  }

  return inputs;
}

export function validateClosableTotal(totalCents: number): string | null {
  if (totalCents === 0) {
    return getErrorMessage('ZERO_TOTAL');
  }

  // The backend accepts a credit, but the product does not sell with a negative total.
  return totalCents < 0 ? getErrorMessage('NEGATIVE_TOTAL') : null;
}

export function validatePaymentRows(
  rows: readonly PaymentDraftRow[],
  totalCents: number,
): string | null {
  const totalError = validateClosableTotal(totalCents);

  if (totalError !== null) {
    return totalError;
  }

  if (rows.length === 0) {
    return 'Adicione pelo menos um pagamento.';
  }

  for (const row of rows) {
    const amountCents = parseDraftCents(row.amountCents);

    if (amountCents === null || amountCents <= 0) {
      return 'Cada pagamento precisa de um valor positivo em centavos.';
    }

    if (row.method !== 'CASH' && row.receivedCents.trim().length > 0) {
      return 'Somente pagamentos em dinheiro podem registrar o valor recebido.';
    }

    if (row.method === 'CASH' && row.receivedCents.trim().length > 0) {
      const receivedCents = parseDraftCents(row.receivedCents);

      if (receivedCents === null || receivedCents <= 0) {
        return 'O valor recebido em dinheiro deve ser positivo em centavos.';
      }

      if (receivedCents < amountCents) {
        return 'O valor recebido não pode ser menor que o pagamento.';
      }
    }
  }

  return paymentDraftTotalCents(rows) === totalCents
    ? null
    : 'Os valores dos pagamentos devem somar o total do pedido.';
}
