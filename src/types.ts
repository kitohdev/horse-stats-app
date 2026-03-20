export interface Horse {
  id: string;
  name: string;
  wins: number;
  second: number;
  third: number;
  other: number;
  winRate: number;
  placeRate: number;
  totalRaces: number;
  createdAt: number;
}

export type TicketType = '単勝' | '複勝' | '馬連' | '馬単' | 'ワイド' | '三連複' | '三連単';

export type TicketMode = 'normal' | 'nagashi' | 'box' | 'formation';

export interface NormalTicketSelection {
  kind: 'normal';
  horses: string[];
}

export interface NagashiTicketSelection {
  kind: 'nagashi';
  axis: string;
  opponents: string[];
}

export interface BoxTicketSelection {
  kind: 'box';
  horses: string[];
}

export interface FormationTicketSelection {
  kind: 'formation';
  frames: string[][];
}

export type TicketSelection =
  | NormalTicketSelection
  | NagashiTicketSelection
  | BoxTicketSelection
  | FormationTicketSelection;

export interface TicketSet {
  id: string;
  type: TicketType;
  mode: TicketMode;
  selection: TicketSelection;
  multi: boolean;
  memo: string;
  createdAt: number;
}

// Keep the existing name for backwards compatibility with current imports.
export type Ticket = TicketSet;

export interface LegacyTicket {
  id: string;
  type: TicketType;
  horses: string[];
  memo: string;
  createdAt: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asUniqueHorseIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;

  const ids: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== 'string' || item.length === 0) return null;
    if (seen.has(item)) continue;
    seen.add(item);
    ids.push(item);
  }

  return ids;
}

function isTicketType(value: unknown): value is TicketType {
  return (
    value === '単勝' ||
    value === '複勝' ||
    value === '馬連' ||
    value === '馬単' ||
    value === 'ワイド' ||
    value === '三連複' ||
    value === '三連単'
  );
}

function isTicketMode(value: unknown): value is TicketMode {
  return value === 'normal' || value === 'nagashi' || value === 'box' || value === 'formation';
}

function normalizeSelection(mode: TicketMode, selection: unknown): TicketSelection | null {
  if (!isRecord(selection)) return null;

  if (mode === 'normal') {
    const horses = asUniqueHorseIds(selection.horses);
    if (!horses) return null;
    return { kind: 'normal', horses };
  }

  if (mode === 'nagashi') {
    if (typeof selection.axis !== 'string' || selection.axis.length === 0) return null;
    const opponents = asUniqueHorseIds(selection.opponents);
    if (!opponents) return null;

    return {
      kind: 'nagashi',
      axis: selection.axis,
      opponents: opponents.filter(opponent => opponent !== selection.axis),
    };
  }

  if (mode === 'box') {
    const horses = asUniqueHorseIds(selection.horses);
    if (!horses) return null;
    return { kind: 'box', horses };
  }

  const framesRaw = selection.frames;
  if (!Array.isArray(framesRaw)) return null;

  const frames: string[][] = [];
  for (const frame of framesRaw) {
    const horseIds = asUniqueHorseIds(frame);
    if (!horseIds) return null;
    frames.push(horseIds);
  }

  return {
    kind: 'formation',
    frames,
  };
}

export function isTicketSet(value: unknown): value is TicketSet {
  if (!isRecord(value)) return false;

  if (
    typeof value.id !== 'string' ||
    !isTicketType(value.type) ||
    !isTicketMode(value.mode) ||
    typeof value.memo !== 'string' ||
    typeof value.createdAt !== 'number' ||
    !Number.isFinite(value.createdAt) ||
    typeof value.multi !== 'boolean'
  ) {
    return false;
  }

  const selection = normalizeSelection(value.mode, value.selection);
  if (!selection) return false;

  return selection.kind === value.mode;
}

function normalizeLegacyTicket(value: unknown): Ticket | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    !isTicketType(value.type) ||
    typeof value.memo !== 'string' ||
    typeof value.createdAt !== 'number' ||
    !Number.isFinite(value.createdAt)
  ) {
    return null;
  }

  const horses = asUniqueHorseIds(value.horses);
  if (!horses) return null;

  return {
    id: value.id,
    type: value.type,
    mode: 'normal',
    selection: {
      kind: 'normal',
      horses,
    },
    multi: false,
    memo: value.memo,
    createdAt: value.createdAt,
  };
}

export function normalizeTicket(value: unknown): Ticket | null {
  if (isTicketSet(value)) {
    const selection = normalizeSelection(value.mode, value.selection);
    if (!selection) return null;

    return {
      id: value.id,
      type: value.type,
      mode: value.mode,
      selection,
      multi: value.multi,
      memo: value.memo,
      createdAt: value.createdAt,
    };
  }

  return normalizeLegacyTicket(value);
}
