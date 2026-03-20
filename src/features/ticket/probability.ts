import { Horse, Ticket, TicketType } from '../../types';
import { generateTicketCombinations } from './combinations';
import { CombinationProbability, TicketProbabilitySummary } from './types';

interface HorseRates {
  p1: number;
  p2: number;
  p3: number;
  pTop3: number;
}

function toRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function toHorseRates(horse: Horse): HorseRates {
  const total = horse.totalRaces;
  return {
    p1: toRate(horse.wins, total),
    p2: toRate(horse.second, total),
    p3: toRate(horse.third, total),
    pTop3: toRate(horse.wins + horse.second + horse.third, total),
  };
}

function lookupRates(
  horseIds: readonly string[],
  horsesById: ReadonlyMap<string, Horse>
): HorseRates[] | null {
  const rates: HorseRates[] = [];

  for (const horseId of horseIds) {
    const horse = horsesById.get(horseId);
    if (!horse) return null;
    rates.push(toHorseRates(horse));
  }

  return rates;
}

function permutation3<T>(items: readonly T[]): [T, T, T][] {
  if (items.length !== 3) return [];

  const [a, b, c] = items;
  return [
    [a, b, c],
    [a, c, b],
    [b, a, c],
    [b, c, a],
    [c, a, b],
    [c, b, a],
  ];
}

export function calculateCombinationProbability(
  type: TicketType,
  horseIds: readonly string[],
  horsesById: ReadonlyMap<string, Horse>
): number {
  const rates = lookupRates(horseIds, horsesById);
  if (!rates) return 0;

  if (type === '単勝') {
    if (rates.length !== 1) return 0;
    return rates[0].p1;
  }

  if (type === '複勝') {
    if (rates.length !== 1) return 0;
    return rates[0].pTop3;
  }

  if (type === '馬単') {
    if (rates.length !== 2) return 0;
    return rates[0].p1 * rates[1].p2;
  }

  if (type === '馬連') {
    if (rates.length !== 2) return 0;
    return rates[0].p1 * rates[1].p2 + rates[1].p1 * rates[0].p2;
  }

  if (type === 'ワイド') {
    if (rates.length !== 2) return 0;
    return rates[0].pTop3 * rates[1].pTop3;
  }

  if (type === '三連単') {
    if (rates.length !== 3) return 0;
    return rates[0].p1 * rates[1].p2 * rates[2].p3;
  }

  if (rates.length !== 3) return 0;

  return permutation3(rates)
    .map(([first, second, third]) => first.p1 * second.p2 * third.p3)
    .reduce((sum, value) => sum + value, 0);
}

function sortCombinationProbabilities(
  combinations: readonly CombinationProbability[]
): CombinationProbability[] {
  return [...combinations].sort((a, b) => {
    if (b.probability !== a.probability) return b.probability - a.probability;
    return a.key.localeCompare(b.key);
  });
}

export function calculateTicketProbabilitySummary(
  ticket: Ticket,
  horsesById: ReadonlyMap<string, Horse>,
  topN: number = 3
): TicketProbabilitySummary {
  const generated = generateTicketCombinations(ticket);
  const combinations: CombinationProbability[] = generated.map(combination => ({
    ...combination,
    probability: calculateCombinationProbability(ticket.type, combination.horseIds, horsesById),
  }));

  const sorted = sortCombinationProbabilities(combinations);

  const meanProbability =
    combinations.length === 0
      ? 0
      : combinations.reduce((sum, combination) => sum + combination.probability, 0) / combinations.length;

  return {
    ticket,
    meanProbability,
    combinations: sorted,
    topCombinations: sorted.slice(0, topN),
  };
}
