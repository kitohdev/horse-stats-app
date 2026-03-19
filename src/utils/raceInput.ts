export interface ParsedRaceCount {
  value: number;
  valid: boolean;
}

export function sanitizeRaceInput(input: string): string {
  return input.replace(/[^\d]/g, '');
}

export function parseRaceCount(input: string): ParsedRaceCount {
  const trimmed = input.trim();
  if (trimmed === '') return { value: 0, valid: true };
  if (!/^\d+$/.test(trimmed)) return { value: 0, valid: false };

  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < 0) {
    return { value: 0, valid: false };
  }

  return { value, valid: true };
}
