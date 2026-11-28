/**
 * Table names are created by the client. Pick the first free sequential name from
 * the live tables so a new table can be opened with one tap.
 */
export function nextTableCode(codes: readonly (string | null)[]): string {
  const used = new Set<number>();

  codes.forEach((code) => {
    if (code === null) {
      return;
    }

    const match = /\d+/.exec(code);
    const value = match === null ? Number.NaN : Number(match[0]);

    if (Number.isSafeInteger(value) && value > 0) {
      used.add(value);
    }
  });

  let next = 1;
  while (used.has(next)) {
    next += 1;
  }

  return `Mesa ${next}`;
}

export function resolveTableCode(suggested: string, custom: string): string {
  const trimmed = custom.trim();
  return trimmed.length === 0 ? suggested : trimmed;
}
