import { TicketMode, TicketType } from '../../types';
import { CombinationMode, PageSizeOption, TicketTypeConfig } from './types';

export const TICKET_TYPE_CONFIGS: ReadonlyArray<TicketTypeConfig> = [
  { type: '単勝', horseCount: 1, ordered: true, combinationEnabled: false },
  { type: '複勝', horseCount: 1, ordered: true, combinationEnabled: false },
  { type: '馬連', horseCount: 2, ordered: false, combinationEnabled: true },
  { type: '馬単', horseCount: 2, ordered: true, combinationEnabled: true },
  { type: 'ワイド', horseCount: 2, ordered: false, combinationEnabled: true },
  { type: '三連複', horseCount: 3, ordered: false, combinationEnabled: true },
  { type: '三連単', horseCount: 3, ordered: true, combinationEnabled: true },
];

const CONFIG_BY_TYPE = new Map<TicketType, TicketTypeConfig>(
  TICKET_TYPE_CONFIGS.map(config => [config.type, config])
);

export const COMBINATION_MODES: ReadonlyArray<CombinationMode> = ['nagashi', 'box', 'formation'];

export const MODE_LABELS: Record<TicketMode, string> = {
  normal: '通常',
  nagashi: '流し',
  box: 'BOX',
  formation: 'フォーメーション',
};

export const PAGE_SIZE_OPTIONS: ReadonlyArray<PageSizeOption> = [100, 200, 300, 'all'];

export function getTicketTypeConfig(type: TicketType): TicketTypeConfig {
  return (
    CONFIG_BY_TYPE.get(type) ?? {
      type,
      horseCount: 1,
      ordered: true,
      combinationEnabled: false,
    }
  );
}
