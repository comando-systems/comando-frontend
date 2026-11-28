import type { DateRangeParams } from '@/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** ISO 8601 instants sent to the backend. */
export interface ReportRange {
  readonly from: string;
  readonly to: string;
}

/** Date-only values shown in the form. */
export interface ReportDateRange {
  readonly fromDate: string;
  readonly toDate: string;
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

export function todayDateRange(now: Date = new Date()): ReportDateRange {
  const today = todayUtcRange(now);

  return {
    fromDate: isoDay(new Date(today.from)),
    toDate: isoDay(new Date(today.to)),
  };
}

/** Masks typed digits as YYYY-MM-DD so partial input stays easy to read. */
export function maskDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 4) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function parseDateInput(value: string): Date | null {
  const match = DATE_PATTERN.exec(value.trim());

  if (match === null) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

/** Validates a date-only field, including partial input, with fixed Portuguese copy. */
export function validateDateInput(value: string): string | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return 'Informe uma data no formato AAAA-MM-DD.';
  }

  if (!DATE_PATTERN.test(trimmed)) {
    return 'Use o formato AAAA-MM-DD para as datas.';
  }

  if (parseDateInput(trimmed) === null) {
    return 'Informe uma data válida do calendário.';
  }

  return null;
}

/** Converts validated date-only inputs to the exclusive UTC range used by the API. */
export function dateRangeFromInputs(fromDate: string, toDate: string): ReportRange | null {
  const from = parseDateInput(fromDate);
  const to = parseDateInput(toDate);

  if (from === null || to === null) {
    return null;
  }

  return { from: from.toISOString(), to: to.toISOString() };
}

export function validateReportDateRange(fromDate: string, toDate: string): string | null {
  const startError = validateDateInput(fromDate);

  if (startError !== null) {
    return `Data inicial: ${startError}`;
  }

  const endError = validateDateInput(toDate);

  if (endError !== null) {
    return `Data final: ${endError}`;
  }

  const from = Date.parse(`${fromDate.trim()}T00:00:00.000Z`);
  const to = Date.parse(`${toDate.trim()}T00:00:00.000Z`);

  if (from >= to) {
    return 'A data final deve ser posterior à data inicial.';
  }

  if (to - from > MAX_RANGE_DAYS * DAY_MS) {
    return 'O período não pode ultrapassar 366 dias.';
  }

  return null;
}

export function reportRangeQuery(range: ReportRange): DateRangeParams {
  return {
    from: new Date(range.from.trim()).toISOString(),
    to: new Date(range.to.trim()).toISOString(),
  };
}
