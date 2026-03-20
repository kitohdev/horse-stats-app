import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAX_BULK_HORSES } from './constants';
import { createBulkHorseInputValues } from './helpers';
import { BulkInputDraft, HorseInputValues } from './types';

const BULK_INPUT_DRAFT_KEY = '@bulk_input_draft';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isHorseInputValues(value: unknown): value is HorseInputValues {
  if (!isRecord(value)) return false;

  return (
    typeof value.name === 'string' &&
    typeof value.wins === 'string' &&
    typeof value.second === 'string' &&
    typeof value.third === 'string' &&
    typeof value.other === 'string'
  );
}

function normalizeHorses(horses: HorseInputValues[]): HorseInputValues[] {
  const normalized = createBulkHorseInputValues();

  horses.slice(0, MAX_BULK_HORSES).forEach((horse, idx) => {
    normalized[idx] = {
      name: horse.name,
      wins: horse.wins,
      second: horse.second,
      third: horse.third,
      other: horse.other,
    };
  });

  return normalized;
}

export async function loadBulkInputDraft(): Promise<BulkInputDraft | null> {
  try {
    const json = await AsyncStorage.getItem(BULK_INPUT_DRAFT_KEY);
    if (!json) return null;

    const parsed: unknown = JSON.parse(json);
    if (!isRecord(parsed)) {
      await AsyncStorage.removeItem(BULK_INPUT_DRAFT_KEY).catch(() => undefined);
      return null;
    }

    const updatedAt = parsed.updatedAt;
    const horses = parsed.horses;
    if (
      typeof updatedAt !== 'number' ||
      !Number.isFinite(updatedAt) ||
      !Array.isArray(horses) ||
      horses.some(horse => !isHorseInputValues(horse))
    ) {
      await AsyncStorage.removeItem(BULK_INPUT_DRAFT_KEY).catch(() => undefined);
      return null;
    }

    return {
      updatedAt,
      horses: normalizeHorses(horses),
    };
  } catch {
    await AsyncStorage.removeItem(BULK_INPUT_DRAFT_KEY).catch(() => undefined);
    return null;
  }
}

export async function saveBulkInputDraft(horses: HorseInputValues[]): Promise<number> {
  const updatedAt = Date.now();
  const draft: BulkInputDraft = {
    updatedAt,
    horses: normalizeHorses(horses),
  };

  await AsyncStorage.setItem(BULK_INPUT_DRAFT_KEY, JSON.stringify(draft));
  return updatedAt;
}

export async function clearBulkInputDraft(): Promise<void> {
  await AsyncStorage.removeItem(BULK_INPUT_DRAFT_KEY);
}
