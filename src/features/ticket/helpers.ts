import { Ticket } from '../../types';
import { getTicketTypeConfig, MODE_LABELS } from './constants';

export function createEmptyFormationFrames(frameCount: number): string[][] {
  return Array.from({ length: Math.max(0, frameCount) }, () => [] as string[]);
}

export function formatPercentFromRate(rate: number): string {
  const percent = Math.max(0, rate * 100);
  const rounded = Math.round(percent * 10) / 10;
  return `${rounded.toFixed(1)}%`;
}

export function formatCombinationHorseNames(
  horseIds: readonly string[],
  resolveHorseName: (horseId: string) => string,
  ordered: boolean
): string {
  const names = horseIds.map(resolveHorseName);
  return ordered ? names.join(' → ') : names.join(' - ');
}

export function formatTicketSelectionSummary(
  ticket: Ticket,
  resolveHorseName: (horseId: string) => string
): string {
  if (ticket.selection.kind === 'normal') {
    return ticket.selection.horses.map(resolveHorseName).join(' → ');
  }

  if (ticket.selection.kind === 'box') {
    return `対象: ${ticket.selection.horses.map(resolveHorseName).join(', ')}`;
  }

  if (ticket.selection.kind === 'nagashi') {
    return `軸: ${resolveHorseName(ticket.selection.axis)} / 相手: ${ticket.selection.opponents
      .map(resolveHorseName)
      .join(', ')}`;
  }

  return ticket.selection.frames
    .map((frame, idx) => `${idx + 1}列目 ${frame.map(resolveHorseName).join(', ')}`)
    .join(' / ');
}

export function formatTicketMeta(ticket: Ticket): string {
  const config = getTicketTypeConfig(ticket.type);
  const multiLabel = config.ordered && ticket.multi ? ' / マルチ' : '';
  return `${MODE_LABELS[ticket.mode]}${multiLabel}`;
}
