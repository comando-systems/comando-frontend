import type { DateRangeParams } from '@/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

export interface ReportRange {
  readonly from: string;
  readonly to: string;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayUtcRange(now: Date = new Date()): ReportRange {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + DAY_MS);

  return {
    from: `${isoDay(start)}T00:00:00.000Z`,
    to: `${isoDay(end)}T00:00:00.000Z`,
  };
}

export function validateReportRange(range: ReportRange): string | null {
  const from = new Date(range.from.trim());
  const to = new Date(range.to.trim());

  if (range.from.trim().length === 0 || range.to.trim().length === 0) {
    return 'Enter both a start and an end.';
  }

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return 'Enter valid ISO 8601 instants.';
  }

  if (from.getTime() >= to.getTime()) {
    return 'The start must be before the end.';
  }

  if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY_MS) {
    return 'The range cannot exceed 366 days.';
  }

  return null;
}

export function reportRangeQuery(range: ReportRange): DateRangeParams {
  return {
    from: new Date(range.from.trim()).toISOString(),
    to: new Date(range.to.trim()).toISOString(),
  };
}
