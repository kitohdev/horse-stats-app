import AsyncStorage from '@react-native-async-storage/async-storage';
import { Horse, Ticket } from '../types';

const HORSES_KEY = '@horses';
const TICKETS_KEY = '@tickets';

export async function loadHorses(): Promise<Horse[]> {
  const json = await AsyncStorage.getItem(HORSES_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveHorse(horse: Horse): Promise<void> {
  const horses = await loadHorses();
  const idx = horses.findIndex(h => h.id === horse.id);
  if (idx >= 0) {
    horses[idx] = horse;
  } else {
    horses.push(horse);
  }
  await AsyncStorage.setItem(HORSES_KEY, JSON.stringify(horses));
}

export async function deleteHorse(id: string): Promise<void> {
  const horses = await loadHorses();
  await AsyncStorage.setItem(HORSES_KEY, JSON.stringify(horses.filter(h => h.id !== id)));
}

export async function loadTickets(): Promise<Ticket[]> {
  const json = await AsyncStorage.getItem(TICKETS_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveTicket(ticket: Ticket): Promise<void> {
  const tickets = await loadTickets();
  const idx = tickets.findIndex(t => t.id === ticket.id);
  if (idx >= 0) {
    tickets[idx] = ticket;
  } else {
    tickets.push(ticket);
  }
  await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
}

export async function deleteTicket(id: string): Promise<void> {
  const tickets = await loadTickets();
  await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(tickets.filter(t => t.id !== id)));
}

export function calcStats(wins: number, second: number, third: number, other: number) {
  const total = wins + second + third + other;
  if (total === 0) return { winRate: 0, placeRate: 0, totalRaces: 0 };
  return {
    winRate: (wins / total) * 100,
    placeRate: ((wins + second + third) / total) * 100,
    totalRaces: total,
  };
}
