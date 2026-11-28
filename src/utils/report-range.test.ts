import {
  dateRangeFromInputs,
  maskDateInput,
  reportRangeQuery,
  todayDateRange,
  todayUtcRange,
  validateDateInput,
  validateReportDateRange,
  type ReportRange,
} from '@/utils/report-range';

describe('todayUtcRange', () => {
  it('returns the UTC day containing the given instant', () => {
    expect(todayUtcRange(new Date('2026-11-22T18:45:00.000Z'))).toEqual({
      from: '2026-11-22T00:00:00.000Z',
      to: '2026-11-23T00:00:00.000Z',
    });
  });

  it('rolls over to the next month', () => {
    expect(todayUtcRange(new Date('2026-11-30T23:59:00.000Z'))).toEqual({
      from: '2026-11-30T00:00:00.000Z',
      to: '2026-12-01T00:00:00.000Z',
    });
  });
});

describe('todayDateRange', () => {
  it('derives date-only fields from the UTC day', () => {
    expect(todayDateRange(new Date('2026-11-30T23:59:00.000Z'))).toEqual({
      fromDate: '2026-11-30',
      toDate: '2026-12-01',
    });
  });
});

describe('maskDateInput', () => {
  it('inserts date separators as digits are typed', () => {
    expect(maskDateInput('2')).toBe('2');
    expect(maskDateInput('2026')).toBe('2026');
    expect(maskDateInput('20261')).toBe('2026-1');
    expect(maskDateInput('202611')).toBe('2026-11');
    expect(maskDateInput('2026112')).toBe('2026-11-2');
    expect(maskDateInput('20261122')).toBe('2026-11-22');
  });

  it('strips non-digits and stops at ten characters', () => {
    expect(maskDateInput('2026/11/22')).toBe('2026-11-22');
    expect(maskDateInput('20ab26-11xx-22')).toBe('2026-11-22');
    expect(maskDateInput('2026-11-22-99')).toBe('2026-11-22');
  });
});

describe('validateDateInput', () => {
  it('accepts real calendar dates', () => {
    expect(validateDateInput('2026-11-22')).toBeNull();
  });

  it('returns fixed Portuguese copy for empty, partial, and impossible dates', () => {
    expect(validateDateInput('')).toBe('Informe uma data no formato AAAA-MM-DD.');
    expect(validateDateInput('2026-1')).toBe('Use o formato AAAA-MM-DD para as datas.');
    expect(validateDateInput('2026-11')).toBe('Use o formato AAAA-MM-DD para as datas.');
    expect(validateDateInput('yesterday')).toBe('Use o formato AAAA-MM-DD para as datas.');
    expect(validateDateInput('2026-02-30')).toBe('Informe uma data válida do calendário.');
  });
});

describe('validateReportDateRange', () => {
  const valid: ReportRange = {
    from: '2026-11-01T00:00:00.000Z',
    to: '2026-11-22T00:00:00.000Z',
  };

  it('accepts a valid date-only range', () => {
    expect(
      validateReportDateRange(valid.from.slice(0, 10), valid.to.slice(0, 10)),
    ).toBeNull();
  });

  it('requires both dates', () => {
    expect(validateReportDateRange('', '2026-11-22')).toBe(
      'Data inicial: Informe uma data no formato AAAA-MM-DD.',
    );
    expect(validateReportDateRange('2026-11-01', '')).toBe(
      'Data final: Informe uma data no formato AAAA-MM-DD.',
    );
  });

  it('rejects partial and impossible dates before querying the backend', () => {
    expect(validateReportDateRange('2026-1', '2026-11-22')).toBe(
      'Data inicial: Use o formato AAAA-MM-DD para as datas.',
    );
    expect(validateReportDateRange('2026-11-01', '2026-02-30')).toBe(
      'Data final: Informe uma data válida do calendário.',
    );
  });

  it('rejects inverted and same-day ranges', () => {
    expect(validateReportDateRange('2026-11-22', '2026-11-01')).toBe(
      'A data final deve ser posterior à data inicial.',
    );
    expect(validateReportDateRange('2026-11-01', '2026-11-01')).toBe(
      'A data final deve ser posterior à data inicial.',
    );
  });

  it('allows 366 days but rejects longer ranges', () => {
    expect(validateReportDateRange('2025-01-01', '2026-01-02')).toBeNull();
    expect(validateReportDateRange('2025-01-01', '2026-01-03')).toBe(
      'O período não pode ultrapassar 366 dias.',
    );
  });
});

describe('dateRangeFromInputs', () => {
  it('converts date-only inputs to midnight UTC instants', () => {
    expect(dateRangeFromInputs('2026-11-01', '2026-11-08')).toEqual({
      from: '2026-11-01T00:00:00.000Z',
      to: '2026-11-08T00:00:00.000Z',
    });
  });

  it('returns null for incomplete or impossible dates', () => {
    expect(dateRangeFromInputs('2026-1', '2026-11-08')).toBeNull();
    expect(dateRangeFromInputs('2026-11-01', '2026-02-30')).toBeNull();
  });
});

describe('reportRangeQuery', () => {
  it('normalizes explicit ISO instants to UTC', () => {
    expect(
      reportRangeQuery({
        from: '2026-11-22T00:00:00-03:00',
        to: '2026-11-23T00:00:00-03:00',
      }),
    ).toEqual({
      from: '2026-11-22T03:00:00.000Z',
      to: '2026-11-23T03:00:00.000Z',
    });
  });
});
