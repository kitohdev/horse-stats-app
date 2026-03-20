import { Ticket, TicketMode, TicketType } from '../../types';

export type AddTicketTab = 'normal' | 'combination';
export type CombinationMode = Exclude<TicketMode, 'normal'>;
export type PageSizeOption = 100 | 200 | 300 | 'all';

export interface TicketTypeConfig {
  type: TicketType;
  horseCount: number;
  ordered: boolean;
  combinationEnabled: boolean;
}

export interface GeneratedCombination {
  horseIds: string[];
  key: string;
}

export interface CombinationProbability extends GeneratedCombination {
  probability: number;
}

export interface TicketProbabilitySummary {
  ticket: Ticket;
  meanProbability: number;
  combinations: CombinationProbability[];
  topCombinations: CombinationProbability[];
}
