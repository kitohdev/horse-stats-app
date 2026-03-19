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

export interface Ticket {
  id: string;
  type: TicketType;
  horses: string[]; // horse ids
  memo: string;
  createdAt: number;
}
