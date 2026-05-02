/**
 * Parse a 'yyyy-MM-dd' date string as local midnight (NOT UTC).
 * JS's `new Date('2026-05-02')` parses as UTC midnight, which shifts
 * backward when formatted in west-of-UTC timezones. Use this helper
 * when you have a date-only string from the database.
 */
export function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split('-').map((s) => parseInt(s, 10));
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}
