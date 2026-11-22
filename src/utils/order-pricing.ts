const MAX_BASIS_POINTS = 10_000;

export interface OrderPreviewLine {
  readonly itemId: string;
  readonly itemName: string;
  readonly unitPriceCents: number;
  readonly quantity: number;
  readonly imageUrl?: string | null;
}

export interface OrderPreviewLineResult extends OrderPreviewLine {
  readonly lineTotalCents: number;
}

export interface OrderPricingInput {
  readonly surchargeCents: number;
  readonly discountCents: number;
  readonly applyServiceFee: boolean;
  readonly serviceFeeBasisPoints: number;
}

export interface OrderPreview extends OrderPricingInput {
  readonly lines: readonly OrderPreviewLineResult[];
  readonly subtotalCents: number;
  readonly maxDiscountCents: number;
  readonly serviceFeeCents: number;
  readonly totalCents: number;
}

function toNonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function parseCentsInput(value: string): number {
  return toNonNegativeInteger(Number.parseInt(value, 10));
}

export function clampDiscountCents(value: number, maxDiscountCents: number): number {
  return Math.min(toNonNegativeInteger(value), toNonNegativeInteger(maxDiscountCents));
}

export function calculateServiceFeeCents(baseCents: number, basisPoints: number): number {
  const base = BigInt(toNonNegativeInteger(baseCents));
  const rate = BigInt(Math.min(MAX_BASIS_POINTS, toNonNegativeInteger(basisPoints)));
  return Number((base * rate + 5000n) / 10000n);
}

export function buildOrderPreview(
  lines: readonly OrderPreviewLine[],
  pricing: OrderPricingInput,
): OrderPreview {
  const normalizedLines = lines.map((line) => {
    const quantity = Number.isFinite(line.quantity) ? Math.max(1, Math.trunc(line.quantity)) : 1;

    return {
      ...line,
      quantity,
      lineTotalCents: toNonNegativeInteger(line.unitPriceCents) * quantity,
    };
  });

  const subtotalCents = normalizedLines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const surchargeCents = toNonNegativeInteger(pricing.surchargeCents);
  const maxDiscountCents = subtotalCents + surchargeCents;
  const discountCents = clampDiscountCents(pricing.discountCents, maxDiscountCents);
  const adjustedCents = maxDiscountCents - discountCents;
  const serviceFeeCents = pricing.applyServiceFee
    ? calculateServiceFeeCents(adjustedCents, pricing.serviceFeeBasisPoints)
    : 0;

  return {
    ...pricing,
    surchargeCents,
    discountCents,
    lines: normalizedLines,
    subtotalCents,
    maxDiscountCents,
    serviceFeeCents,
    totalCents: adjustedCents + serviceFeeCents,
  };
}
