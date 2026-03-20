import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Horse, Ticket, TicketType } from '../../../types';
import { generateTicketCombinations } from '../combinations';
import { TICKET_TYPE_CONFIGS, getTicketTypeConfig } from '../constants';
import { createEmptyFormationFrames } from '../helpers';
import { CombinationMode } from '../types';
import HorseSelectionMatrix, { HorseSelectionColumn, HorseSelectionRow } from './HorseSelectionMatrix';

const GREEN = '#006934';
const BORDER = '#B2D8C4';

const COMBINATION_MODE_TABS: ReadonlyArray<{ mode: CombinationMode; label: string }> = [
  { mode: 'formation', label: '通常フォーメーション' },
  { mode: 'nagashi', label: 'ながし' },
  { mode: 'box', label: 'ボックス' },
];

const COMBINATION_MODE_SUMMARY_LABEL: Record<CombinationMode, string> = {
  formation: '通常フォーメーション',
  nagashi: 'ながし',
  box: 'ボックス',
};

interface TicketAddModalProps {
  visible: boolean;
  horses: Horse[];
  onClose: () => void;
  onSubmitTicket: (ticket: Ticket) => Promise<void>;
}

interface SelectionSummaryLine {
  label: string;
  value: string;
}

interface HorseRecordLines {
  top: string;
  bottom: string;
}

function uniqueHorseIds(horseIds: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const horseId of horseIds) {
    if (!horseId || seen.has(horseId)) continue;
    seen.add(horseId);
    unique.push(horseId);
  }

  return unique;
}

function createTicket(
  type: TicketType,
  mode: Ticket['mode'],
  selection: Ticket['selection'],
  multi: boolean
): Ticket {
  return {
    id: Date.now().toString(),
    type,
    mode,
    selection,
    multi,
    memo: '',
    createdAt: Date.now(),
  };
}

function previewTicket(
  type: TicketType,
  mode: Ticket['mode'],
  selection: Ticket['selection'],
  multi: boolean
): Ticket {
  return {
    id: 'preview',
    type,
    mode,
    selection,
    multi,
    memo: '',
    createdAt: 0,
  };
}

function formatHorseRecord(horse: Horse): HorseRecordLines {
  return {
    top: `${horse.wins}-${horse.second}-${horse.third}-${horse.other}（${horse.totalRaces}戦）`,
    bottom: `勝率${horse.winRate.toFixed(1)}%・複勝率${horse.placeRate.toFixed(1)}%`,
  };
}

export default function TicketAddModal({ visible, horses, onClose, onSubmitTicket }: TicketAddModalProps) {
  const [selectedType, setSelectedType] = useState<TicketType>('単勝');

  const [normalHorseIds, setNormalHorseIds] = useState<string[]>([]);

  const [combinationMode, setCombinationMode] = useState<CombinationMode>('formation');
  const [multi, setMulti] = useState(false);
  const [nagashiAxis, setNagashiAxis] = useState('');
  const [nagashiOpponents, setNagashiOpponents] = useState<string[]>([]);
  const [boxHorseIds, setBoxHorseIds] = useState<string[]>([]);
  const [formationFrames, setFormationFrames] = useState<string[][]>(createEmptyFormationFrames(2));

  const typeConfig = getTicketTypeConfig(selectedType);
  const canUseCombinationTab = typeConfig.combinationEnabled;
  const activeMode: Ticket['mode'] = canUseCombinationTab ? combinationMode : 'normal';
  const supportsMulti = typeConfig.ordered && (activeMode === 'nagashi' || activeMode === 'formation');

  const horsesById = useMemo(() => new Map(horses.map(horse => [horse.id, horse])), [horses]);

  const matrixRows = useMemo<HorseSelectionRow[]>(
    () =>
      horses.map((horse, index) => {
        const record = formatHorseRecord(horse);
        return {
          id: horse.id,
          label: horse.name.trim() || `馬${index + 1}`,
          subLabelTop: record.top,
          subLabelBottom: record.bottom,
        };
      }),
    [horses]
  );

  const singleSelectColumns = useMemo<readonly HorseSelectionColumn[]>(
    () => [{ key: 'select', label: '選択' }],
    []
  );

  const formationColumns = useMemo<HorseSelectionColumn[]>(
    () =>
      Array.from({ length: typeConfig.horseCount }, (_, index) => ({
        key: `frame-${index}`,
        label: `${index + 1}頭目`,
      })),
    [typeConfig.horseCount]
  );

  const formationSelectedByColumn = useMemo<Readonly<Record<string, readonly string[]>>>(
    () =>
      formationColumns.reduce<Record<string, readonly string[]>>((acc, column, index) => {
        acc[column.key] = formationFrames[index] ?? [];
        return acc;
      }, {}),
    [formationColumns, formationFrames]
  );

  const nagashiColumns = useMemo<readonly HorseSelectionColumn[]>(
    () => [
      { key: 'axis', label: '軸', controlType: 'radio' },
      { key: 'opponents', label: '相手' },
    ],
    []
  );

  const nagashiSelectedByColumn = useMemo<Readonly<Record<string, readonly string[]>>>(
    () => ({
      axis: nagashiAxis ? [nagashiAxis] : [],
      opponents: nagashiOpponents,
    }),
    [nagashiAxis, nagashiOpponents]
  );

  const normalSelectedByColumn = useMemo<Readonly<Record<string, readonly string[]>>>(
    () => ({ select: normalHorseIds }),
    [normalHorseIds]
  );

  const boxSelectedByColumn = useMemo<Readonly<Record<string, readonly string[]>>>(
    () => ({ select: boxHorseIds }),
    [boxHorseIds]
  );

  function resolveHorseName(horseId: string): string {
    return horsesById.get(horseId)?.name ?? '?';
  }

  function summarizeHorseNames(horseIds: readonly string[]): string {
    if (horseIds.length === 0) return '-';
    return horseIds.map(resolveHorseName).join(', ');
  }

  function resetForType(type: TicketType): void {
    const config = getTicketTypeConfig(type);
    setNormalHorseIds([]);
    setCombinationMode('formation');
    setMulti(false);
    setNagashiAxis('');
    setNagashiOpponents([]);
    setBoxHorseIds([]);
    setFormationFrames(createEmptyFormationFrames(config.horseCount));
  }

  useEffect(() => {
    if (!visible) return;
    setSelectedType('単勝');
    resetForType('単勝');
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const config = getTicketTypeConfig(selectedType);
    setFormationFrames(createEmptyFormationFrames(config.horseCount));
    setMulti(false);
  }, [selectedType, visible]);

  useEffect(() => {
    if (!supportsMulti) {
      setMulti(false);
    }
  }, [supportsMulti]);

  const preview = useMemo(() => {
    const selection: Ticket['selection'] =
      activeMode === 'normal'
        ? { kind: 'normal', horses: uniqueHorseIds(normalHorseIds) }
        : activeMode === 'nagashi'
          ? { kind: 'nagashi', axis: nagashiAxis, opponents: uniqueHorseIds(nagashiOpponents) }
          : activeMode === 'box'
            ? { kind: 'box', horses: uniqueHorseIds(boxHorseIds) }
            : { kind: 'formation', frames: formationFrames.map(frame => uniqueHorseIds(frame)) };

    const ticket = previewTicket(selectedType, activeMode, selection, supportsMulti ? multi : false);
    return generateTicketCombinations(ticket);
  }, [
    activeMode,
    boxHorseIds,
    formationFrames,
    multi,
    nagashiAxis,
    nagashiOpponents,
    normalHorseIds,
    selectedType,
    supportsMulti,
  ]);

  const selectionSummaryLines = useMemo<SelectionSummaryLine[]>(() => {
    if (activeMode === 'normal') {
      return [{ label: '選択', value: summarizeHorseNames(uniqueHorseIds(normalHorseIds)) }];
    }

    if (activeMode === 'box') {
      return [{ label: '選択', value: summarizeHorseNames(uniqueHorseIds(boxHorseIds)) }];
    }

    if (activeMode === 'nagashi') {
      return [
        { label: '軸', value: nagashiAxis ? resolveHorseName(nagashiAxis) : '-' },
        { label: '相手', value: summarizeHorseNames(uniqueHorseIds(nagashiOpponents)) },
      ];
    }

    return formationFrames.map((frame, index) => ({
      label: `${index + 1}頭目`,
      value: summarizeHorseNames(uniqueHorseIds(frame)),
    }));
  }, [activeMode, boxHorseIds, formationFrames, horsesById, nagashiAxis, nagashiOpponents, normalHorseIds]);

  const summaryTitle = useMemo(() => {
    if (activeMode === 'normal') {
      return selectedType;
    }
    return `${selectedType} ${COMBINATION_MODE_SUMMARY_LABEL[activeMode]}`;
  }, [activeMode, selectedType]);

  function toggleNormalHorse(horseId: string): void {
    setNormalHorseIds(prev => {
      if (prev.includes(horseId)) return prev.filter(id => id !== horseId);
      if (prev.length >= typeConfig.horseCount) {
        return [...prev.slice(1), horseId];
      }
      return [...prev, horseId];
    });
  }

  function toggleNormalMatrixCell(columnKey: string, horseId: string): void {
    if (columnKey !== 'select') return;
    toggleNormalHorse(horseId);
  }

  function toggleNagashiOpponent(horseId: string): void {
    setNagashiOpponents(prev => {
      if (horseId === nagashiAxis) return prev;
      if (prev.includes(horseId)) return prev.filter(id => id !== horseId);
      return [...prev, horseId];
    });
  }

  function toggleBoxHorse(horseId: string): void {
    setBoxHorseIds(prev => {
      if (prev.includes(horseId)) return prev.filter(id => id !== horseId);
      return [...prev, horseId];
    });
  }

  function toggleFormationHorse(frameIndex: number, horseId: string): void {
    setFormationFrames(prev => {
      const next = prev.map(frame => [...frame]);
      if (!next[frameIndex]) return prev;

      const exists = next[frameIndex].includes(horseId);
      next[frameIndex] = exists
        ? next[frameIndex].filter(id => id !== horseId)
        : [...next[frameIndex], horseId];

      return next;
    });
  }

  function toggleFormationMatrixCell(columnKey: string, horseId: string): void {
    const frameIndex = formationColumns.findIndex(column => column.key === columnKey);
    if (frameIndex < 0) return;
    toggleFormationHorse(frameIndex, horseId);
  }

  function toggleNagashiMatrixCell(columnKey: string, horseId: string): void {
    if (columnKey === 'axis') {
      setNagashiAxis(prev => (prev === horseId ? '' : horseId));
      setNagashiOpponents(prev => prev.filter(id => id !== horseId));
      return;
    }

    if (columnKey === 'opponents') {
      toggleNagashiOpponent(horseId);
    }
  }

  function isNagashiMatrixCellDisabled(columnKey: string, horseId: string): boolean {
    if (columnKey === 'opponents') {
      return nagashiAxis === horseId;
    }
    return false;
  }

  function toggleBoxMatrixCell(columnKey: string, horseId: string): void {
    if (columnKey !== 'select') return;
    toggleBoxHorse(horseId);
  }

  async function handleSubmit(): Promise<void> {
    if (horses.length === 0) {
      Alert.alert('保存した馬がありません');
      return;
    }

    let ticket: Ticket;

    if (activeMode === 'normal') {
      const horsesSelected = uniqueHorseIds(normalHorseIds);
      if (horsesSelected.length !== typeConfig.horseCount) {
        Alert.alert(`${typeConfig.horseCount}頭選択してください`);
        return;
      }

      ticket = createTicket(
        selectedType,
        'normal',
        {
          kind: 'normal',
          horses: horsesSelected,
        },
        false
      );
    } else if (activeMode === 'box') {
      const horsesSelected = uniqueHorseIds(boxHorseIds);
      if (horsesSelected.length < typeConfig.horseCount) {
        Alert.alert(`BOXは最低${typeConfig.horseCount}頭選択してください`);
        return;
      }

      ticket = createTicket(
        selectedType,
        'box',
        {
          kind: 'box',
          horses: horsesSelected,
        },
        false
      );
    } else if (activeMode === 'nagashi') {
      const opponents = uniqueHorseIds(nagashiOpponents).filter(id => id !== nagashiAxis);
      if (!nagashiAxis) {
        Alert.alert('流しの軸馬を選択してください');
        return;
      }
      if (opponents.length < typeConfig.horseCount - 1) {
        Alert.alert(`流しの相手を最低${typeConfig.horseCount - 1}頭選択してください`);
        return;
      }

      ticket = createTicket(
        selectedType,
        'nagashi',
        {
          kind: 'nagashi',
          axis: nagashiAxis,
          opponents,
        },
        supportsMulti ? multi : false
      );
    } else {
      const frames = formationFrames.map(frame => uniqueHorseIds(frame));
      if (frames.some(frame => frame.length === 0)) {
        Alert.alert('フォーメーションは全ての列に1頭以上選択してください');
        return;
      }

      ticket = createTicket(
        selectedType,
        'formation',
        {
          kind: 'formation',
          frames,
        },
        supportsMulti ? multi : false
      );
    }

    if (generateTicketCombinations(ticket).length === 0) {
      Alert.alert('有効なフォーメーションがありません', '選択条件を見直してください');
      return;
    }

    try {
      await onSubmitTicket(ticket);
      onClose();
    } catch {
      Alert.alert('保存に失敗しました', '時間をおいて再試行してください');
    }
  }

  function onTypePress(type: TicketType): void {
    setSelectedType(type);
    resetForType(type);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelBtn}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>馬券を追加</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentContainer}>
          <Text style={styles.sectionLabel}>馬券種別</Text>
          <View style={styles.typeGrid}>
            {TICKET_TYPE_CONFIGS.map(config => (
              <TouchableOpacity
                key={config.type}
                style={[styles.typeOption, selectedType === config.type && styles.typeOptionActive]}
                onPress={() => onTypePress(config.type)}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    selectedType === config.type && styles.typeOptionTextActive,
                  ]}
                >
                  {config.type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {canUseCombinationTab && (
            <>
              <Text style={styles.sectionLabel}>方式選択</Text>
              <View style={styles.methodGrid}>
                {COMBINATION_MODE_TABS.map(tab => (
                  <TouchableOpacity
                    key={tab.mode}
                    style={[styles.methodOption, combinationMode === tab.mode && styles.methodOptionActive]}
                    onPress={() => setCombinationMode(tab.mode)}
                  >
                    <Text
                      style={[
                        styles.methodOptionText,
                        combinationMode === tab.mode && styles.methodOptionTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {supportsMulti && (
            <TouchableOpacity style={styles.multiToggle} onPress={() => setMulti(prev => !prev)}>
              <Text style={styles.multiText}>{multi ? 'マルチ: ON' : 'マルチ: OFF'}</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.sectionLabel}>組み合わせ選択</Text>
          {activeMode === 'normal' && (
            <HorseSelectionMatrix
              horses={matrixRows}
              columns={singleSelectColumns}
              selectedByColumn={normalSelectedByColumn}
              onToggleCell={toggleNormalMatrixCell}
              horseHeaderLabel="馬"
            />
          )}

          {activeMode === 'nagashi' && (
            <>
              <HorseSelectionMatrix
                horses={matrixRows}
                columns={nagashiColumns}
                selectedByColumn={nagashiSelectedByColumn}
                onToggleCell={toggleNagashiMatrixCell}
                isCellDisabled={isNagashiMatrixCellDisabled}
                horseHeaderLabel="馬"
              />
              <Text style={styles.selectionHint}>
                軸は1頭、相手は最低{Math.max(1, typeConfig.horseCount - 1)}頭を選択してください
              </Text>
            </>
          )}

          {activeMode === 'box' && (
            <HorseSelectionMatrix
              horses={matrixRows}
              columns={singleSelectColumns}
              selectedByColumn={boxSelectedByColumn}
              onToggleCell={toggleBoxMatrixCell}
              horseHeaderLabel="馬"
            />
          )}

          {activeMode === 'formation' && (
            <>
              <HorseSelectionMatrix
                horses={matrixRows}
                columns={formationColumns}
                selectedByColumn={formationSelectedByColumn}
                onToggleCell={toggleFormationMatrixCell}
                horseHeaderLabel="馬"
              />
              <Text style={styles.selectionHint}>各列で1頭以上を選択してください</Text>
            </>
          )}
        </ScrollView>

        <View style={styles.bottomPanel}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeaderRow}>
              <Text style={styles.summaryTitle}>{summaryTitle}</Text>
              <Text style={styles.summaryPoint}>{preview.length}点</Text>
            </View>
            {selectionSummaryLines.map(line => (
              <View key={line.label} style={styles.summaryLineRow}>
                <Text style={styles.summaryLineLabel}>{line.label}</Text>
                <Text style={styles.summaryLineValue} numberOfLines={2}>
                  {line.value}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={() => void handleSubmit()}>
            <Text style={styles.submitBtnText}>追加</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: '#F7F9F8',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#FFF',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22322B',
  },
  cancelBtn: {
    color: '#5D6D65',
    fontSize: 15,
  },
  headerSpacer: {
    width: 66,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 220,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: GREEN,
    marginTop: 16,
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    minWidth: 74,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  typeOptionActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  typeOptionText: {
    fontSize: 13,
    color: '#4C6758',
    fontWeight: '700',
  },
  typeOptionTextActive: {
    color: '#FFF',
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodOption: {
    flexGrow: 1,
    minWidth: 96,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  methodOptionActive: {
    backgroundColor: '#2F5CB7',
    borderColor: '#2F5CB7',
  },
  methodOptionText: {
    fontSize: 12,
    color: '#4C6758',
    fontWeight: '700',
  },
  methodOptionTextActive: {
    color: '#FFF',
  },
  multiToggle: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  multiText: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '700',
  },
  selectionHint: {
    marginTop: 8,
    color: '#5A6F64',
    fontSize: 12,
  },
  bottomPanel: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FAFCFB',
    marginBottom: 10,
    gap: 6,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    color: '#22322B',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryPoint: {
    color: '#E53935',
    fontSize: 19,
    fontWeight: '700',
  },
  summaryLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  summaryLineLabel: {
    width: 56,
    color: '#4C6758',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryLineValue: {
    flex: 1,
    color: '#22322B',
    fontSize: 12,
  },
  submitBtn: {
    borderRadius: 8,
    backgroundColor: '#E74C3C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
