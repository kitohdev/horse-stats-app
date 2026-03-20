import { RaceField } from './types';

export const MAX_BULK_HORSES = 18;

export const RACE_FIELD_LABELS: ReadonlyArray<{ field: RaceField; label: string }> = [
  { field: 'wins', label: '1着' },
  { field: 'second', label: '2着' },
  { field: 'third', label: '3着' },
  { field: 'other', label: '着外' },
];
