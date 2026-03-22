import { Ticket } from '../../types';
import { getTicketTypeConfig } from './constants';
import { GeneratedCombination } from './types';

function uniqueHorseIds(horseIds: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const horseId of horseIds) {
    if (!horseId || seen.has(horseId)) continue;
    seen.add(horseId);
    result.push(horseId);
  }

  return result;
}

function hasDuplicatedHorse(horseIds: readonly string[]): boolean {
  return uniqueHorseIds(horseIds).length !== horseIds.length;
}

function normalizeHorseIdsForCombination(horseIds: readonly string[], ordered: boolean): string[] {
  return ordered ? [...horseIds] : [...horseIds].sort();
}

function encodeHorseIdsForKey(horseIds: readonly string[]): string {
  // Length-prefix encoding avoids key collisions even if IDs include separators.
  return horseIds.map(horseId => `${horseId.length}:${horseId}`).join('|');
}

export function createCombinationKey(horseIds: readonly string[], ordered: boolean): string {
  const normalizedHorseIds = normalizeHorseIdsForCombination(horseIds, ordered);
  return encodeHorseIdsForKey(normalizedHorseIds);
}

function dedupeCombinations(candidates: readonly string[][], ordered: boolean): GeneratedCombination[] {
  const seen = new Set<string>();
  const combinations: GeneratedCombination[] = [];

  for (const candidate of candidates) {
    if (candidate.length === 0 || hasDuplicatedHorse(candidate)) continue;

    const normalizedHorseIds = normalizeHorseIdsForCombination(candidate, ordered);
    const key = encodeHorseIdsForKey(normalizedHorseIds);
    if (seen.has(key)) continue;

    seen.add(key);
    combinations.push({ horseIds: normalizedHorseIds, key });
  }

  return combinations.sort((a, b) => a.key.localeCompare(b.key));
}

function choose<T>(items: readonly T[], pickCount: number): T[][] {
  if (pickCount < 0) return [];
  if (pickCount === 0) return [[]];
  if (items.length < pickCount) return [];

  const result: T[][] = [];

  function recurse(startIndex: number, selected: T[]): void {
    if (selected.length === pickCount) {
      result.push([...selected]);
      return;
    }

    for (let idx = startIndex; idx < items.length; idx += 1) {
      selected.push(items[idx]);
      recurse(idx + 1, selected);
      selected.pop();
    }
  }

  recurse(0, []);
  return result;
}

function permute<T>(items: readonly T[], pickCount: number): T[][] {
  if (pickCount < 0) return [];
  if (pickCount === 0) return [[]];
  if (items.length < pickCount) return [];

  const result: T[][] = [];

  function recurse(selected: T[], used: boolean[]): void {
    if (selected.length === pickCount) {
      result.push([...selected]);
      return;
    }

    for (let idx = 0; idx < items.length; idx += 1) {
      if (used[idx]) continue;
      used[idx] = true;
      selected.push(items[idx]);
      recurse(selected, used);
      selected.pop();
      used[idx] = false;
    }
  }

  recurse([], Array.from({ length: items.length }, () => false));
  return result;
}

export function generateBoxCombinations(type: Ticket['type'], horseIds: readonly string[]): GeneratedCombination[] {
  const config = getTicketTypeConfig(type);
  const unique = uniqueHorseIds(horseIds);

  if (unique.length < config.horseCount) return [];

  const candidates = config.ordered
    ? permute(unique, config.horseCount)
    : choose(unique, config.horseCount);

  return dedupeCombinations(candidates, config.ordered);
}

export function generateNagashiCombinations(
  type: Ticket['type'],
  axis: string,
  opponents: readonly string[],
  multi: boolean
): GeneratedCombination[] {
  const config = getTicketTypeConfig(type);

  if (!axis) return [];

  const opponentPool = uniqueHorseIds(opponents).filter(horseId => horseId !== axis);
  const restCount = config.horseCount - 1;
  if (restCount < 0 || opponentPool.length < restCount) return [];

  const selectedOpponentGroups = choose(opponentPool, restCount);
  const candidates: string[][] = [];

  for (const group of selectedOpponentGroups) {
    if (!config.ordered) {
      candidates.push([axis, ...group]);
      continue;
    }

    if (multi) {
      candidates.push(...permute([axis, ...group], config.horseCount));
      continue;
    }

    if (restCount <= 1) {
      candidates.push([axis, ...group]);
      continue;
    }

    const tailPermutations = permute(group, restCount);
    for (const tail of tailPermutations) {
      candidates.push([axis, ...tail]);
    }
  }

  return dedupeCombinations(candidates, config.ordered);
}

function productFrames(frames: readonly string[][]): string[][] {
  if (frames.length === 0) return [];

  const result: string[][] = [];

  function recurse(frameIndex: number, selected: string[]): void {
    if (frameIndex === frames.length) {
      result.push([...selected]);
      return;
    }

    for (const horseId of frames[frameIndex]) {
      selected.push(horseId);
      recurse(frameIndex + 1, selected);
      selected.pop();
    }
  }

  recurse(0, []);
  return result;
}

export function generateFormationCombinations(
  type: Ticket['type'],
  frames: readonly string[][],
  multi: boolean
): GeneratedCombination[] {
  const config = getTicketTypeConfig(type);
  if (frames.length !== config.horseCount) return [];

  const normalizedFrames = frames.map(frame => uniqueHorseIds(frame));
  if (normalizedFrames.some(frame => frame.length === 0)) return [];

  const products = productFrames(normalizedFrames);
  const candidates: string[][] = [];

  for (const product of products) {
    if (hasDuplicatedHorse(product)) continue;

    if (!config.ordered) {
      candidates.push(product);
      continue;
    }

    if (!multi) {
      candidates.push(product);
      continue;
    }

    candidates.push(...permute(product, product.length));
  }

  return dedupeCombinations(candidates, config.ordered);
}

function generateNormalCombinations(ticket: Ticket): GeneratedCombination[] {
  if (ticket.selection.kind !== 'normal') return [];

  const config = getTicketTypeConfig(ticket.type);
  const horses = [...ticket.selection.horses];

  if (horses.length !== config.horseCount || hasDuplicatedHorse(horses)) return [];

  return dedupeCombinations([horses], config.ordered);
}

export function generateTicketCombinations(ticket: Ticket): GeneratedCombination[] {
  if (ticket.mode === 'normal') {
    return generateNormalCombinations(ticket);
  }

  if (ticket.mode === 'box') {
    if (ticket.selection.kind !== 'box') return [];
    return generateBoxCombinations(ticket.type, ticket.selection.horses);
  }

  if (ticket.mode === 'nagashi') {
    if (ticket.selection.kind !== 'nagashi') return [];
    return generateNagashiCombinations(
      ticket.type,
      ticket.selection.axis,
      ticket.selection.opponents,
      ticket.multi
    );
  }

  if (ticket.selection.kind !== 'formation') return [];
  return generateFormationCombinations(ticket.type, ticket.selection.frames, ticket.multi);
}
