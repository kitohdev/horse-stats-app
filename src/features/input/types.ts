export type RaceField = 'wins' | 'second' | 'third' | 'other';

export interface HorseInputValues {
  name: string;
  wins: string;
  second: string;
  third: string;
  other: string;
}

export interface BulkInputDraft {
  updatedAt: number;
  horses: HorseInputValues[];
}
