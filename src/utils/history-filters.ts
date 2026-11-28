import type { OrderListParams, OrderStatus, OrderType } from '@/types';

export type HistoryStatusFilter = OrderStatus | 'ALL';
export type HistoryTypeFilter = OrderType | 'ALL';

export interface HistoryFilters {
  readonly status: HistoryStatusFilter;
  readonly type: HistoryTypeFilter;
  readonly tableCode: string;
  readonly fromDate: string;
  readonly toDate: string;
}

export const EMPTY_HISTORY_FILTERS: HistoryFilters = {
  status: 'ALL',
  type: 'ALL',
  tableCode: '',
  fromDate: '',
  toDate: '',
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

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

export function dateInputToUtcIso(value: string, endOfDay: boolean): string | null {
  const date = parseDateInput(value);

  if (date === null) {
    return null;
  }

  if (endOfDay) {
    date.setUTCHours(23, 59, 59, 999);
  }

  return date.toISOString();
}

export function validateHistoryFilters(filters: HistoryFilters): string | null {
  const from = parseDateInput(filters.fromDate);
  const to = parseDateInput(filters.toDate);

  if (filters.fromDate.trim().length > 0 && from === null) {
    return 'Informe a data inicial no formato AAAA-MM-DD.';
  }

  if (filters.toDate.trim().length > 0 && to === null) {
    return 'Informe a data final no formato AAAA-MM-DD.';
  }

  if (from !== null && to !== null && from > to) {
    return 'A data inicial deve ser anterior à data final.';
  }

  if (filters.tableCode.trim().length > 64) {
    return 'O nome da mesa deve ter no máximo 64 caracteres.';
  }

  return null;
}

export function historyListQuery(
  filters: HistoryFilters,
  page: number,
  pageSize: number,
): OrderListParams {
  const tableCode = filters.tableCode.trim();
  const from = dateInputToUtcIso(filters.fromDate, false);
  const to = dateInputToUtcIso(filters.toDate, true);

  return {
    page,
    pageSize,
    ...(filters.status === 'ALL' ? {} : { status: filters.status }),
    ...(filters.type === 'ALL' ? {} : { type: filters.type }),
    ...(tableCode.length === 0 ? {} : { tableCode }),
    ...(from === null ? {} : { from }),
    ...(to === null ? {} : { to }),
  } satisfies OrderListParams;
}
