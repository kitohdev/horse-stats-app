import AsyncStorage from '@react-native-async-storage/async-storage';
import { Horse, Ticket, isTicketSet, normalizeTicket } from '../types';

const HORSES_KEY = '@horses';
const TICKETS_KEY = '@tickets';
const storageWriteQueues = new Map<string, Promise<void>>();

async function loadList<T>(key: string): Promise<T[]> {
  try {
    const json = await AsyncStorage.getItem(key);
    if (!json) return [];

    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      await AsyncStorage.removeItem(key).catch(() => undefined);
      return [];
    }
    return parsed as T[];
  } catch {
    await AsyncStorage.removeItem(key).catch(() => undefined);
    return [];
  }
}

async function enqueueListUpdate<T>(
  key: string,
  updater: (current: T[]) => T[]
): Promise<void> {
  const previous = storageWriteQueues.get(key) ?? Promise.resolve();

  const next = previous
    .catch(() => undefined)
    .then(async () => {
      const current = await loadList<T>(key);
      const updated = updater(current);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    });

  storageWriteQueues.set(key, next);
  await next;
}

export async function loadHorses(): Promise<Horse[]> {
  return loadList<Horse>(HORSES_KEY);
}

export async function replaceHorses(horses: Horse[]): Promise<void> {
  await enqueueListUpdate<Horse>(HORSES_KEY, () => horses);
}

export async function saveHorse(horse: Horse): Promise<void> {
  await enqueueListUpdate<Horse>(HORSES_KEY, horses => {
    const idx = horses.findIndex(h => h.id === horse.id);
    if (idx < 0) return [...horses, horse];

    const updated = [...horses];
    updated[idx] = horse;
    return updated;
  });
}

export async function deleteHorse(id: string): Promise<void> {
  await enqueueListUpdate<Horse>(HORSES_KEY, horses => horses.filter(h => h.id !== id));
}

export async function loadTickets(): Promise<Ticket[]> {
  const rawTickets = await loadList<unknown>(TICKETS_KEY);
  const normalizedTickets = rawTickets
    .map(rawTicket => normalizeTicket(rawTicket))
    .filter((ticket): ticket is Ticket => ticket !== null);

  const shouldRewrite =
    normalizedTickets.length !== rawTickets.length ||
    rawTickets.some(rawTicket => !isTicketSet(rawTicket));

  if (shouldRewrite) {
    await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(normalizedTickets)).catch(() => undefined);
  }

  return normalizedTickets;
}

export async function saveTicket(ticket: Ticket): Promise<void> {
  const normalizedTicket = normalizeTicket(ticket);
  if (!normalizedTicket) {
    throw new Error('Invalid ticket payload');
  }

  await enqueueListUpdate<unknown>(TICKETS_KEY, current => {
    const tickets = current
      .map(rawTicket => normalizeTicket(rawTicket))
      .filter((value): value is Ticket => value !== null);

    const idx = tickets.findIndex(existingTicket => existingTicket.id === normalizedTicket.id);
    if (idx < 0) return [...tickets, normalizedTicket];

    const updated = [...tickets];
    updated[idx] = normalizedTicket;
    return updated;
  });
}

export async function deleteTicket(id: string): Promise<void> {
  await enqueueListUpdate<unknown>(TICKETS_KEY, current => {
    const tickets = current
      .map(rawTicket => normalizeTicket(rawTicket))
      .filter((value): value is Ticket => value !== null);

    return tickets.filter(ticket => ticket.id !== id);
  });
}

export function calcStats(
  wins: number,
  second: number,
  third: number,
  other: number
): { winRate: number; placeRate: number; totalRaces: number } {
  const total = wins + second + third + other;
  if (total === 0) return { winRate: 0, placeRate: 0, totalRaces: 0 };
  return {
    winRate: (wins / total) * 100,
    placeRate: ((wins + second + third) / total) * 100,
    totalRaces: total,
  };
}
