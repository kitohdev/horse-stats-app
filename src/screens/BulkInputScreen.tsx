import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from 'react-native';
import RaceInputs from '../components/horse/RaceInputs';
import { MAX_BULK_HORSES, RACE_FIELD_LABELS } from '../features/input/constants';
import { createBulkHorseInputValues, parseHorseInput } from '../features/input/helpers';
import { HorseInputValues, RaceField } from '../features/input/types';
import { replaceHorses } from '../store/horses';
import { Horse } from '../types';

const GREEN = '#006934';
const BORDER = '#B2D8C4';
const LIGHT_GREEN = '#E8F5EE';

type ScreenTab = 'input' | 'confirm';
type ConfirmSortKey =
  | 'horseNumber'
  | 'record'
  | 'winRate'
  | 'quinellaRate'
  | 'placeRate'
  | 'totalRaces';
type SortDirection = 'asc' | 'desc';

interface ConfirmedHorseRecord {
  horseNumber: number;
  wins: number;
  second: number;
  third: number;
  other: number;
  winRate: number;
  quinellaRate: number;
  placeRate: number;
  totalRaces: number;
}

const RACE_FIELDS: RaceField[] = RACE_FIELD_LABELS.map(label => label.field);

function compareRaceRecord(a: ConfirmedHorseRecord, b: ConfirmedHorseRecord): number {
  if (a.wins !== b.wins) return a.wins - b.wins;
  if (a.second !== b.second) return a.second - b.second;
  if (a.third !== b.third) return a.third - b.third;
  return a.other - b.other;
}

function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) {
    return `${rounded}%`;
  }
  return `${rounded.toFixed(1)}%`;
}

function toHorseRecord(row: ConfirmedHorseRecord, createdAt: number): Horse {
  return {
    id: `horse-${row.horseNumber}`,
    name: String(row.horseNumber),
    wins: row.wins,
    second: row.second,
    third: row.third,
    other: row.other,
    winRate: row.winRate,
    placeRate: row.placeRate,
    totalRaces: row.totalRaces,
    createdAt,
  };
}

export default function BulkInputScreen() {
  const [inputs, setInputs] = useState<HorseInputValues[]>(createBulkHorseInputValues);
  const [activeTab, setActiveTab] = useState<ScreenTab>('input');
  const [confirmedRows, setConfirmedRows] = useState<ConfirmedHorseRecord[]>([]);
  const [sortKey, setSortKey] = useState<ConfirmSortKey>('horseNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const inputRefs = useRef<Array<Array<RNTextInput | null>>>([]);

  const parsedInputs = useMemo(() => inputs.map(parseHorseInput), [inputs]);
  const activeInputCount = parsedInputs.filter(input => input.hasAnyInput).length;
  const hasConfirmedData = confirmedRows.length > 0;
  const canOpenConfirmTab = hasConfirmedData || activeInputCount > 0;
  const sortedConfirmedRows = useMemo(() => {
    const sorted = [...confirmedRows].sort((a, b) => {
      let result = 0;

      switch (sortKey) {
        case 'horseNumber':
          result = a.horseNumber - b.horseNumber;
          break;
        case 'record':
          result = compareRaceRecord(a, b);
          break;
        case 'winRate':
          result = a.winRate - b.winRate;
          break;
        case 'quinellaRate':
          result = a.quinellaRate - b.quinellaRate;
          break;
        case 'placeRate':
          result = a.placeRate - b.placeRate;
          break;
        case 'totalRaces':
          result = a.totalRaces - b.totalRaces;
          break;
        default:
          result = 0;
      }

      if (result === 0) {
        return a.horseNumber - b.horseNumber;
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return sorted;
  }, [confirmedRows, sortDirection, sortKey]);

  function updateHorseRaceField(index: number, field: RaceField, value: string) {
    setInputs(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function registerInputRef(index: number, field: RaceField, ref: RNTextInput | null) {
    const fieldIndex = RACE_FIELDS.indexOf(field);
    if (fieldIndex < 0) return;

    if (!inputRefs.current[index]) {
      inputRefs.current[index] = [];
    }
    inputRefs.current[index][fieldIndex] = ref;
  }

  function focusNextInput(index: number, field: RaceField) {
    const fieldIndex = RACE_FIELDS.indexOf(field);
    if (fieldIndex < 0) return;

    const isLastField = fieldIndex === RACE_FIELDS.length - 1;
    const nextHorseIndex = isLastField ? index + 1 : index;
    const nextFieldIndex = isLastField ? 0 : fieldIndex + 1;
    const nextInput = inputRefs.current[nextHorseIndex]?.[nextFieldIndex];

    if (nextInput) {
      nextInput.focus();
    }
  }

  async function handleConfirmInput() {
    const filledRows = parsedInputs
      .map((parsed, index) => ({ parsed, index }))
      .filter(row => row.parsed.hasAnyInput);

    if (filledRows.length === 0) {
      Alert.alert('入力してください', '確認する馬がありません');
      return;
    }

    const errors: string[] = [];

    for (const row of filledRows) {
      const horseNumber = row.index + 1;
      if (row.parsed.hasInvalidInput) {
        errors.push(`馬番${horseNumber}: 戦歴は0以上の整数で入力してください`);
        continue;
      }
      if (!row.parsed.hasRaceInput) {
        errors.push(`馬番${horseNumber}: 戦歴を入力してください`);
      }
    }

    if (errors.length > 0) {
      Alert.alert('入力内容を確認してください', errors.slice(0, 4).join('\n'));
      return;
    }

    const now = Date.now();

    const nextConfirmedRows: ConfirmedHorseRecord[] = filledRows.map(({ parsed, index }) => {
      const total = parsed.stats.totalRaces;
      const quinellaRate = total > 0 ? ((parsed.wins + parsed.second) / total) * 100 : 0;

      return {
        horseNumber: index + 1,
        wins: parsed.wins,
        second: parsed.second,
        third: parsed.third,
        other: parsed.other,
        winRate: parsed.stats.winRate,
        quinellaRate,
        placeRate: parsed.stats.placeRate,
        totalRaces: total,
      };
    });

    const horses = nextConfirmedRows.map((row, idx) => toHorseRecord(row, now + idx));

    try {
      await replaceHorses(horses);
      setConfirmedRows(nextConfirmedRows);
      setActiveTab('confirm');
    } catch {
      Alert.alert('保存に失敗しました', '時間をおいて再試行してください');
    }
  }

  async function resetToNewInput() {
    try {
      await replaceHorses([]);
      setInputs(createBulkHorseInputValues());
      setConfirmedRows([]);
      setActiveTab('input');
    } catch {
      Alert.alert('初期化に失敗しました', '時間をおいて再試行してください');
    }
  }

  function handleStartNewInput() {
    Alert.alert('', '現在の入力内容が全て削除されます。よろしいですか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'OK',
        style: 'destructive',
        onPress: () => {
          void resetToNewInput();
        },
      },
    ]);
  }

  function handleSortPress(nextSortKey: ConfirmSortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection('asc');
  }

  function getHeaderSortButtonStyle(targetKey: ConfirmSortKey) {
    if (sortKey !== targetKey) return undefined;
    return sortDirection === 'asc' ? styles.headerSortButtonAsc : styles.headerSortButtonDesc;
  }

  function getHeaderTextStyle(targetKey: ConfirmSortKey) {
    if (sortKey !== targetKey) return undefined;
    return sortDirection === 'asc' ? styles.recordHeaderTextAsc : styles.recordHeaderTextDesc;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>戦歴</Text>
          {activeTab === 'confirm' && (
            <TouchableOpacity style={styles.newInputButton} onPress={handleStartNewInput}>
              <Text style={styles.newInputButtonText}>新規入力</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'input' && styles.tabButtonActive]}
            onPress={() => setActiveTab('input')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'input' && styles.tabButtonTextActive]}>
              戦歴
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'confirm' && styles.tabButtonActive,
              !canOpenConfirmTab && styles.tabButtonDisabled,
            ]}
            onPress={() => {
              if (hasConfirmedData) {
                setActiveTab('confirm');
                return;
              }
              void handleConfirmInput();
            }}
            disabled={!canOpenConfirmTab}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'confirm' && styles.tabButtonTextActive,
                !canOpenConfirmTab && styles.tabButtonTextDisabled,
              ]}
            >
              戦歴確認
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'input' ? (
          <>
            <Text style={styles.subtitle}>最大{MAX_BULK_HORSES}頭まで一括入力できます</Text>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>入力中: {activeInputCount} / {MAX_BULK_HORSES}頭</Text>
            </View>

            {inputs.map((input, index) => {
              const parsed = parsedInputs[index];

              return (
                <View key={`bulk-horse-${index}`} style={styles.card}>
                  <Text style={styles.cardTitle}>馬番 {index + 1}</Text>
                  <RaceInputs
                    values={input}
                    onChangeField={(field, value) => updateHorseRaceField(index, field, value)}
                    compact
                    registerInputRef={(field, ref) => registerInputRef(index, field, ref)}
                    onSubmitField={field => focusNextInput(index, field)}
                  />
                  <Text style={styles.hint}>{parsed.hasRaceInput ? `${parsed.stats.totalRaces}戦` : '未入力'}</Text>
                </View>
              );
            })}

            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmInput}>
              <Text style={styles.confirmButtonText}>入力を確定</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.confirmContainer}>
            <View style={[styles.recordRow, styles.recordHeaderRow]}>
              <TouchableOpacity
                style={[
                  styles.recordCell,
                  styles.colHorse,
                  styles.headerSortButton,
                  getHeaderSortButtonStyle('horseNumber'),
                ]}
                onPress={() => handleSortPress('horseNumber')}
              >
                <Text style={[styles.recordHeaderText, getHeaderTextStyle('horseNumber')]}>馬番</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.recordCell,
                  styles.colRecord,
                  styles.headerSortButton,
                  getHeaderSortButtonStyle('record'),
                ]}
                onPress={() => handleSortPress('record')}
              >
                <Text style={[styles.recordHeaderText, getHeaderTextStyle('record')]}>戦歴</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.recordCell,
                  styles.colRate,
                  styles.headerSortButton,
                  getHeaderSortButtonStyle('winRate'),
                ]}
                onPress={() => handleSortPress('winRate')}
              >
                <Text style={[styles.recordHeaderText, getHeaderTextStyle('winRate')]}>勝率</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.recordCell,
                  styles.colRate,
                  styles.headerSortButton,
                  getHeaderSortButtonStyle('quinellaRate'),
                ]}
                onPress={() => handleSortPress('quinellaRate')}
              >
                <Text style={[styles.recordHeaderText, getHeaderTextStyle('quinellaRate')]}>連対率</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.recordCell,
                  styles.colRate,
                  styles.headerSortButton,
                  getHeaderSortButtonStyle('placeRate'),
                ]}
                onPress={() => handleSortPress('placeRate')}
              >
                <Text style={[styles.recordHeaderText, getHeaderTextStyle('placeRate')]}>複勝率</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.recordCell,
                  styles.colTotal,
                  styles.headerSortButton,
                  getHeaderSortButtonStyle('totalRaces'),
                ]}
                onPress={() => handleSortPress('totalRaces')}
              >
                <Text style={[styles.recordHeaderText, getHeaderTextStyle('totalRaces')]}>総レース数</Text>
              </TouchableOpacity>
            </View>

            {sortedConfirmedRows.map(row => (
              <View key={`confirmed-row-${row.horseNumber}`} style={styles.recordRow}>
                <Text style={[styles.recordCell, styles.colHorse]}>{row.horseNumber}</Text>
                <Text style={[styles.recordCell, styles.colRecord]}>
                  {`${row.wins}-${row.second}-${row.third}-${row.other}`}
                </Text>
                <Text style={[styles.recordCell, styles.colRate]}>{formatPercent(row.winRate)}</Text>
                <Text style={[styles.recordCell, styles.colRate]}>{formatPercent(row.quinellaRate)}</Text>
                <Text style={[styles.recordCell, styles.colRate]}>{formatPercent(row.placeRate)}</Text>
                <Text style={[styles.recordCell, styles.colTotal]}>{`計${row.totalRaces}戦`}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F8' },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: '700', color: GREEN, marginBottom: 4 },
  newInputButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GREEN,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFF',
  },
  newInputButtonText: { color: GREEN, fontSize: 12, fontWeight: '700' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 4,
    marginTop: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  tabButtonActive: {
    backgroundColor: GREEN,
  },
  tabButtonDisabled: {
    backgroundColor: '#F1F1F1',
  },
  tabButtonText: { color: '#4C6758', fontSize: 14, fontWeight: '700' },
  tabButtonTextActive: { color: '#FFF' },
  tabButtonTextDisabled: { color: '#A0A0A0' },
  subtitle: { fontSize: 12, color: '#6A7A71', marginTop: 10, marginBottom: 12 },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginBottom: 12,
  },
  summaryText: { fontSize: 13, fontWeight: '700', color: GREEN },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: GREEN, marginBottom: 8 },
  hint: { fontSize: 12, color: '#6A7A71', marginTop: 8, textAlign: 'right' },
  confirmButton: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  confirmContainer: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  recordRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0EAE4',
    minHeight: 44,
    alignItems: 'center',
  },
  recordHeaderRow: {
    backgroundColor: LIGHT_GREEN,
  },
  recordCell: {
    paddingHorizontal: 6,
    fontSize: 12,
    color: '#22322B',
  },
  recordHeaderText: {
    fontWeight: '700',
    color: GREEN,
  },
  recordHeaderTextAsc: { color: '#0D452A' },
  recordHeaderTextDesc: { color: '#FFFFFF' },
  headerSortButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSortButtonAsc: {
    backgroundColor: '#DDEFE5',
  },
  headerSortButtonDesc: {
    backgroundColor: '#2A7A57',
  },
  colHorse: { width: '11%', textAlign: 'center' },
  colRecord: { width: '17%', textAlign: 'center' },
  colRate: { width: '16%', textAlign: 'center' },
  colTotal: { width: '24%', textAlign: 'center' },
});
