import {
  EMPTY_HISTORY_FILTERS,
  dateInputToUtcIso,
  historyListQuery,
  validateHistoryFilters,
} from '@/utils/history-filters';

describe('history filter helpers', () => {
  it('converts date inputs to UTC day boundaries', () => {
    expect(dateInputToUtcIso('2026-01-01', false)).toBe('2026-01-01T00:00:00.000Z');
    expect(dateInputToUtcIso('2026-01-31', true)).toBe('2026-01-31T23:59:59.999Z');
    expect(dateInputToUtcIso('2026-02-30', false)).toBeNull();
    expect(dateInputToUtcIso('31/01/2026', false)).toBeNull();
  });

  it('defaults to finalized orders and builds a query with supported parameters only', () => {
    expect(historyListQuery(EMPTY_HISTORY_FILTERS, 2, 20)).toEqual({
      statuses: ['CLOSED', 'CANCELED'],
      page: 2,
      pageSize: 20,
    });

    expect(
      historyListQuery(
        {
          status: 'CLOSED',
          type: 'TABLE',
          tableCode: ' T-02 ',
          fromDate: '2026-01-01',
          toDate: '2026-01-31',
        },
        1,
        20,
      ),
    ).toEqual({
      status: 'CLOSED',
      type: 'TABLE',
      tableCode: 'T-02',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.999Z',
      page: 1,
      pageSize: 20,
    });
  });

  it('rejects invalid dates, reversed ranges, and long table codes', () => {
    expect(validateHistoryFilters(EMPTY_HISTORY_FILTERS)).toBeNull();
    expect(validateHistoryFilters({ ...EMPTY_HISTORY_FILTERS, fromDate: '01/01/2026' })).toBe(
      'Informe a data inicial no formato AAAA-MM-DD.',
    );
    expect(validateHistoryFilters({ ...EMPTY_HISTORY_FILTERS, toDate: '2026-02-30' })).toBe(
      'Informe a data final no formato AAAA-MM-DD.',
    );
    expect(
      validateHistoryFilters({
        ...EMPTY_HISTORY_FILTERS,
        fromDate: '2026-02-02',
        toDate: '2026-02-01',
      }),
    ).toBe('A data inicial deve ser anterior à data final.');
    expect(validateHistoryFilters({ ...EMPTY_HISTORY_FILTERS, tableCode: 'x'.repeat(65) })).toBe(
      'O nome da mesa deve ter no máximo 64 caracteres.',
    );
  });
});
