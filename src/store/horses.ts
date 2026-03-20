import AsyncStorage from '@react-native-async-storage/async-storage';
import { Horse, Ticket } from '../types';

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
  return loadList<Ticket>(TICKETS_KEY);
}

export async function saveTicket(ticket: Ticket): Promise<void> {
  await enqueueListUpdate<Ticket>(TICKETS_KEY, tickets => {
    const idx = tickets.findIndex(t => t.id === ticket.id);
    if (idx < 0) return [...tickets, ticket];

    const updated = [...tickets];
    updated[idx] = ticket;
    return updated;
  });
}

export async function deleteTicket(id: string): Promise<void> {
  await enqueueListUpdate<Ticket>(TICKETS_KEY, tickets => tickets.filter(t => t.id !== id));
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
