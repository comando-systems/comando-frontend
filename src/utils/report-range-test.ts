import {
  reportRangeQuery,
  todayUtcRange,
  validateReportRange,
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

describe('validateReportRange', () => {
  const valid: ReportRange = {
    from: '2026-11-01T00:00:00.000Z',
    to: '2026-11-22T00:00:00.000Z',
  };

  it('accepts a valid range', () => {
    expect(validateReportRange(valid)).toBeNull();
  });

  it('requires both instants', () => {
    expect(validateReportRange({ from: '', to: valid.to })).toBe('Enter both a start and an end.');
  });

  it('rejects invalid dates and reversed or excessive ranges', () => {
    expect(validateReportRange({ from: 'yesterday', to: valid.to })).toBe(
      'Enter valid ISO 8601 instants.',
    );
    expect(validateReportRange({ from: valid.to, to: valid.from })).toBe(
      'The start must be before the end.',
    );
    expect(
      validateReportRange({
        from: '2025-01-01T00:00:00.000Z',
        to: '2026-11-22T00:00:00.000Z',
      }),
    ).toBe('The range cannot exceed 366 days.');
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
