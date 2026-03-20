import { calcStats } from '../../store/horses';
import { Horse } from '../../types';
import { parseRaceCount } from '../../utils/raceInput';
import { MAX_BULK_HORSES } from './constants';
import { HorseInputValues } from './types';

export interface ParsedHorseInput {
  trimmedName: string;
  wins: number;
  second: number;
  third: number;
  other: number;
  hasInvalidInput: boolean;
  hasRaceInput: boolean;
  hasAnyInput: boolean;
  stats: {
    winRate: number;
    placeRate: number;
    totalRaces: number;
  };
}

export function createEmptyHorseInputValues(): HorseInputValues {
  return {
    name: '',
    wins: '',
    second: '',
    third: '',
    other: '',
  };
}

export function createBulkHorseInputValues(
  count: number = MAX_BULK_HORSES
): HorseInputValues[] {
  return Array.from({ length: count }, () => createEmptyHorseInputValues());
}

export function parseHorseInput(input: HorseInputValues): ParsedHorseInput {
  const winsParsed = parseRaceCount(input.wins);
  const secondParsed = parseRaceCount(input.second);
  const thirdParsed = parseRaceCount(input.third);
  const otherParsed = parseRaceCount(input.other);

  const wins = winsParsed.value;
  const second = secondParsed.value;
  const third = thirdParsed.value;
  const other = otherParsed.value;

  const hasInvalidInput =
    !winsParsed.valid || !secondParsed.valid || !thirdParsed.valid || !otherParsed.valid;
  const hasRaceInput = !hasInvalidInput && wins + second + third + other > 0;

  const hasAnyInput =
    input.name.trim().length > 0 ||
    input.wins.trim().length > 0 ||
    input.second.trim().length > 0 ||
    input.third.trim().length > 0 ||
    input.other.trim().length > 0;

  return {
    trimmedName: input.name.trim(),
    wins,
    second,
    third,
    other,
    hasInvalidInput,
    hasRaceInput,
    hasAnyInput,
    stats: calcStats(wins, second, third, other),
  };
}

export function createHorseFromParsed(
  parsed: ParsedHorseInput,
  id: string,
  createdAt: number
): Horse {
  return {
    id,
    name: parsed.trimmedName,
    wins: parsed.wins,
    second: parsed.second,
    third: parsed.third,
    other: parsed.other,
    ...parsed.stats,
    createdAt,
  };
}
