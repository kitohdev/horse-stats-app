import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  TextInputProps,
  Keyboard,
  KeyboardEvent,
  findNodeHandle,
  PanResponder,
} from 'react-native';
import RaceInputs from '../components/horse/RaceInputs';
import { MAX_BULK_HORSES, RACE_FIELD_LABELS } from '../features/input/constants';
import { createBulkHorseInputValues, parseHorseInput } from '../features/input/helpers';
import { HorseInputValues, RaceField } from '../features/input/types';
import { loadHorses, replaceHorses } from '../store/horses';
import { Horse } from '../types';

const GREEN = '#006934';
const BORDER = '#B2D8C4';
const LIGHT_GREEN = '#E8F5EE';
const KEYBOARD_SCROLL_EXTRA_OFFSET = Platform.OS === 'ios' ? 210 : 140;
const SWIPE_ACTIVATE_DISTANCE = 16;
const SWIPE_MAX_VERTICAL_DRIFT = 24;
const SWIPE_TO_CONFIRM_TRIGGER_DISTANCE = 56;
const SWIPE_TO_INPUT_TRIGGER_DISTANCE = 56;
const AUTO_SAVE_DEBOUNCE_MS = 240;

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

interface FocusedInput {
  horseIndex: number;
  field: RaceField;
}

interface ScrollResponderWithKeyboard {
  scrollResponderScrollNativeHandleToKeyboard: (
    nodeHandle: number,
    additionalOffset?: number,
    preventNegativeScrollOffset?: boolean
  ) => void;
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

function toPositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function resolveHorseNumber(horse: Horse): number | null {
  const byId = /^horse-(\d+)$/.exec(horse.id);
  if (byId) {
    return toPositiveInteger(byId[1]);
  }

  return toPositiveInteger(horse.name.trim());
}

function createBulkInputsFromHorses(horses: Horse[]): HorseInputValues[] {
  const nextInputs = createBulkHorseInputValues();

  horses.forEach(horse => {
    const horseNumber = resolveHorseNumber(horse);
    if (!horseNumber || horseNumber > MAX_BULK_HORSES) {
      return;
    }

    const index = horseNumber - 1;
    nextInputs[index] = {
      ...nextInputs[index],
      wins: String(horse.wins),
      second: String(horse.second),
      third: String(horse.third),
      other: String(horse.other),
    };
  });

  return nextInputs;
}

export default function BulkInputScreen() {
  const [inputs, setInputs] = useState<HorseInputValues[]>(createBulkHorseInputValues);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<ScreenTab>('input');
  const [sortKey, setSortKey] = useState<ConfirmSortKey>('horseNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [tabRowWidth, setTabRowWidth] = useState(0);

  const scrollViewRef = useRef<ScrollView | null>(null);
  const inputRefs = useRef<Array<Array<RNTextInput | null>>>([]);
  const persistedPreviewSnapshotRef = useRef<string>('');
  const tabSlide = useRef(new Animated.Value(activeTab === 'input' ? 0 : 1)).current;

  const parsedInputs = useMemo(() => inputs.map(parseHorseInput), [inputs]);
  const activeInputCount = parsedInputs.filter(input => input.hasAnyInput).length;
  const previewRows = useMemo<ConfirmedHorseRecord[]>(
    () =>
      parsedInputs
        .map((parsed, index) => ({ parsed, index }))
        .filter(({ parsed }) => parsed.hasRaceInput && !parsed.hasInvalidInput)
        .map(({ parsed, index }) => {
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
        }),
    [parsedInputs]
  );

  const contentBottomPadding = keyboardHeight > 0 ? keyboardHeight + 48 : 40;
  const tabSegmentWidth = tabRowWidth > 8 ? (tabRowWidth - 8) / 2 : 0;
  const tabIndicatorTranslateX = tabSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabSegmentWidth],
  });
  const sortedPreviewRows = useMemo(() => {
    const sorted = [...previewRows].sort((a, b) => {
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
  }, [previewRows, sortDirection, sortKey]);

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

  function getFieldIndex(field: RaceField): number {
    return RACE_FIELDS.indexOf(field);
  }

  function toLinearInputIndex(target: FocusedInput): number {
    const fieldIndex = getFieldIndex(target.field);
    if (fieldIndex < 0) return -1;
    return target.horseIndex * RACE_FIELDS.length + fieldIndex;
  }

  function toFocusedInput(linearIndex: number): FocusedInput | null {
    if (linearIndex < 0) return null;

    const horseIndex = Math.floor(linearIndex / RACE_FIELDS.length);
    const fieldIndex = linearIndex % RACE_FIELDS.length;
    const field = RACE_FIELDS[fieldIndex];

    if (horseIndex < 0 || horseIndex >= inputs.length || !field) {
      return null;
    }

    return { horseIndex, field };
  }

  function scrollInputIntoView(index: number, field: RaceField) {
    const fieldIndex = getFieldIndex(field);
    if (fieldIndex < 0) return;

    const targetInput = inputRefs.current[index]?.[fieldIndex];
    if (!targetInput) return;

    const nodeHandle = findNodeHandle(targetInput);
    if (!nodeHandle) return;

    const responder = scrollViewRef.current?.getScrollResponder?.() as ScrollResponderWithKeyboard | undefined;
    if (responder?.scrollResponderScrollNativeHandleToKeyboard) {
      responder.scrollResponderScrollNativeHandleToKeyboard(nodeHandle, KEYBOARD_SCROLL_EXTRA_OFFSET, true);
      return;
    }

    const fallbackY = Math.max(0, index * 130);
    scrollViewRef.current?.scrollTo({ y: fallbackY, animated: true });
  }

  function focusInput(target: FocusedInput): boolean {
    const fieldIndex = getFieldIndex(target.field);
    if (fieldIndex < 0) return false;

    const input = inputRefs.current[target.horseIndex]?.[fieldIndex];
    if (!input) return false;

    input.focus();
    requestAnimationFrame(() => {
      scrollInputIntoView(target.horseIndex, target.field);
    });
    return true;
  }

  function focusAdjacentInput(index: number, field: RaceField, offset: 1 | -1): boolean {
    const currentLinearIndex = toLinearInputIndex({ horseIndex: index, field });
    if (currentLinearIndex < 0) return false;

    const nextTarget = toFocusedInput(currentLinearIndex + offset);
    if (!nextTarget) return false;

    return focusInput(nextTarget);
  }

  function focusNextInput(index: number, field: RaceField): boolean {
    return focusAdjacentInput(index, field, 1);
  }

  function handleFocusField(index: number, field: RaceField) {
    requestAnimationFrame(() => {
      scrollInputIntoView(index, field);
    });
  }

  function handleSubmitField(index: number, field: RaceField) {
    const moved = focusNextInput(index, field);
    if (!moved) {
      Keyboard.dismiss();
    }
  }

  function resolveReturnKeyType(index: number, field: RaceField): TextInputProps['returnKeyType'] {
    const fieldIndex = RACE_FIELDS.indexOf(field);
    const isLastField = fieldIndex === RACE_FIELDS.length - 1;
    const isLastHorse = index === inputs.length - 1;

    if (isLastHorse && isLastField) {
      return 'done';
    }

    return 'next';
  }

  async function persistPreviewRows(rows: ConfirmedHorseRecord[]) {
    const now = Date.now();
    const horses = rows.map((row, idx) => toHorseRecord(row, now + idx));
    try {
      await replaceHorses(horses);
    } catch {
      // オートセーブ失敗時は入力を止めない
    }
  }

  async function resetToNewInput() {
    try {
      await replaceHorses([]);
      persistedPreviewSnapshotRef.current = JSON.stringify([]);
      setInputs(createBulkHorseInputValues());
      setActiveTab('input');
      Keyboard.dismiss();
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

  function switchToInputTab() {
    setActiveTab('input');
  }

  function switchToConfirmTab() {
    setActiveTab('confirm');
  }

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'confirm') {
      Keyboard.dismiss();
    }
  }, [activeTab]);

  useEffect(() => {
    Animated.timing(tabSlide, {
      toValue: activeTab === 'input' ? 0 : 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabSlide]);

  useEffect(() => {
    let mounted = true;

    loadHorses()
      .then(savedHorses => {
        if (!mounted) return;
        setInputs(createBulkInputsFromHorses(savedHorses));
      })
      .catch(() => {
        if (!mounted) return;
        setInputs(createBulkHorseInputValues());
      })
      .finally(() => {
        if (!mounted) return;
        setHasHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const snapshot = JSON.stringify(previewRows);
    if (snapshot === persistedPreviewSnapshotRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      persistedPreviewSnapshotRef.current = snapshot;
      void persistPreviewRows(previewRows);
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [hasHydrated, previewRows]);

  function shouldCaptureHorizontalSwipe(dx: number, dy: number): boolean {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    return (
      absDx > SWIPE_ACTIVATE_DISTANCE &&
      absDy < SWIPE_MAX_VERTICAL_DRIFT &&
      absDx > absDy * 1.2
    );
  }

  const tabSwipeResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gestureState) =>
      shouldCaptureHorizontalSwipe(gestureState.dx, gestureState.dy),
    onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
      shouldCaptureHorizontalSwipe(gestureState.dx, gestureState.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_event, gestureState) => {
      if (activeTab === 'confirm' && gestureState.dx >= SWIPE_TO_INPUT_TRIGGER_DISTANCE) {
        switchToInputTab();
        return;
      }

      if (activeTab === 'input' && gestureState.dx <= -SWIPE_TO_CONFIRM_TRIGGER_DISTANCE) {
        switchToConfirmTab();
      }
    },
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>戦績入力</Text>
          {activeTab === 'confirm' && (
            <TouchableOpacity style={styles.newInputButton} onPress={handleStartNewInput}>
              <Text style={styles.newInputButtonText}>新規入力</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabRow} onLayout={event => setTabRowWidth(event.nativeEvent.layout.width)}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.tabActivePill,
              { width: tabSegmentWidth, transform: [{ translateX: tabIndicatorTranslateX }] },
            ]}
          />
          <TouchableOpacity
            style={styles.tabButton}
            onPress={switchToInputTab}
            activeOpacity={0.9}
          >
            <Text style={[styles.tabButtonText, activeTab === 'input' && styles.tabButtonTextActive]}>
              戦績入力
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={switchToConfirmTab}
            activeOpacity={0.9}
          >
            <Text style={[styles.tabButtonText, activeTab === 'confirm' && styles.tabButtonTextActive]}>
              戦績確認
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bodySwipeArea} {...tabSwipeResponder.panHandlers}>
          {activeTab === 'input' ? (
            <>
              <Text style={styles.subtitle}>
                最大{MAX_BULK_HORSES}頭まで一括入力できます。入力内容は自動で保存されます。
              </Text>
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
                      onFocusField={field => handleFocusField(index, field)}
                      onSubmitField={field => handleSubmitField(index, field)}
                      resolveReturnKeyType={field => resolveReturnKeyType(index, field)}
                    />
                    <Text style={styles.hint}>{parsed.hasRaceInput ? `${parsed.stats.totalRaces}戦` : '未入力'}</Text>
                  </View>
                );
              })}
            </>
          ) : (
            <>
              {sortedPreviewRows.length === 0 ? (
                <View style={styles.emptyConfirmCard}>
                  <Text style={styles.emptyConfirmText}>入力中の有効データがありません</Text>
                </View>
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
                      <Text style={[styles.recordHeaderText, getHeaderTextStyle('record')]}>戦績</Text>
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

                  {sortedPreviewRows.map(row => (
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
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F8' },
  content: { padding: 16, paddingBottom: 40, flexGrow: 1 },
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
    position: 'relative',
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
    zIndex: 1,
  },
  tabActivePill: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: 8,
    backgroundColor: GREEN,
  },
  tabButtonText: { color: '#4C6758', fontSize: 14, fontWeight: '700' },
  tabButtonTextActive: { color: '#FFF' },
  bodySwipeArea: { marginTop: 2, flexGrow: 1, minHeight: '100%' },
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
  emptyConfirmCard: {
    marginTop: 12,
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyConfirmText: { fontSize: 13, color: '#6A7A71', fontWeight: '600' },
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
