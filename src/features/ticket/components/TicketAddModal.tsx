import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Horse, Ticket, TicketType } from '../../../types';
import { generateTicketCombinations } from '../combinations';
import { COMBINATION_MODES, MODE_LABELS, TICKET_TYPE_CONFIGS, getTicketTypeConfig } from '../constants';
import { createEmptyFormationFrames, formatCombinationHorseNames } from '../helpers';
import { AddTicketTab, CombinationMode } from '../types';

const GREEN = '#006934';
const LIGHT_GREEN = '#E8F5EE';
const BORDER = '#B2D8C4';

interface TicketAddModalProps {
  visible: boolean;
  horses: Horse[];
  onClose: () => void;
  onSubmitTicket: (ticket: Ticket) => Promise<void>;
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

export default function TicketAddModal({ visible, horses, onClose, onSubmitTicket }: TicketAddModalProps) {
  const [selectedType, setSelectedType] = useState<TicketType>('単勝');
  const [addTab, setAddTab] = useState<AddTicketTab>('normal');

  const [normalHorseIds, setNormalHorseIds] = useState<string[]>([]);

  const [combinationMode, setCombinationMode] = useState<CombinationMode>('nagashi');
  const [multi, setMulti] = useState(false);
  const [nagashiAxis, setNagashiAxis] = useState('');
  const [nagashiOpponents, setNagashiOpponents] = useState<string[]>([]);
  const [boxHorseIds, setBoxHorseIds] = useState<string[]>([]);
  const [formationFrames, setFormationFrames] = useState<string[][]>(createEmptyFormationFrames(2));

  const typeConfig = getTicketTypeConfig(selectedType);
  const canUseCombinationTab = typeConfig.combinationEnabled;
  const supportsMulti = typeConfig.ordered && (combinationMode === 'nagashi' || combinationMode === 'formation');

  const horsesById = useMemo(() => new Map(horses.map(horse => [horse.id, horse])), [horses]);

  function resolveHorseName(horseId: string): string {
    return horsesById.get(horseId)?.name ?? '?';
  }

  function resetForType(type: TicketType): void {
    const config = getTicketTypeConfig(type);
    setNormalHorseIds([]);
    setCombinationMode('nagashi');
    setMulti(false);
    setNagashiAxis('');
    setNagashiOpponents([]);
    setBoxHorseIds([]);
    setFormationFrames(createEmptyFormationFrames(config.horseCount));
    setAddTab('normal');
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

    if (!config.combinationEnabled) {
      setAddTab('normal');
    }
  }, [selectedType, visible]);

  useEffect(() => {
    if (!supportsMulti) {
      setMulti(false);
    }
  }, [supportsMulti]);

  const preview = useMemo(() => {
    const ticket = previewTicket(
      selectedType,
      addTab === 'combination' && canUseCombinationTab ? combinationMode : 'normal',
      addTab === 'combination' && canUseCombinationTab
        ? combinationMode === 'nagashi'
          ? { kind: 'nagashi', axis: nagashiAxis, opponents: uniqueHorseIds(nagashiOpponents) }
          : combinationMode === 'box'
            ? { kind: 'box', horses: uniqueHorseIds(boxHorseIds) }
            : { kind: 'formation', frames: formationFrames.map(frame => uniqueHorseIds(frame)) }
        : { kind: 'normal', horses: uniqueHorseIds(normalHorseIds) },
      supportsMulti ? multi : false
    );

    return generateTicketCombinations(ticket);
  }, [
    addTab,
    boxHorseIds,
    canUseCombinationTab,
    combinationMode,
    formationFrames,
    multi,
    nagashiAxis,
    nagashiOpponents,
    normalHorseIds,
    selectedType,
    supportsMulti,
  ]);

  const previewTop = preview.slice(0, 5);

  function toggleNormalHorse(horseId: string): void {
    setNormalHorseIds(prev => {
      if (prev.includes(horseId)) return prev.filter(id => id !== horseId);
      if (prev.length >= typeConfig.horseCount) {
        return [...prev.slice(1), horseId];
      }
      return [...prev, horseId];
    });
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

  async function handleSubmit(): Promise<void> {
    if (horses.length === 0) {
      Alert.alert('保存した馬がありません');
      return;
    }

    const isCombination = addTab === 'combination' && canUseCombinationTab;

    let ticket: Ticket;

    if (!isCombination) {
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
    } else if (combinationMode === 'box') {
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
    } else if (combinationMode === 'nagashi') {
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
      Alert.alert('有効な組み合わせがありません', '選択条件を見直してください');
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
          <TouchableOpacity onPress={() => void handleSubmit()}>
            <Text style={styles.doneBtn}>追加</Text>
          </TouchableOpacity>
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

          <Text style={styles.sectionLabel}>入力モード</Text>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabButton, addTab === 'normal' && styles.tabButtonActive]}
              onPress={() => setAddTab('normal')}
            >
              <Text style={[styles.tabButtonText, addTab === 'normal' && styles.tabButtonTextActive]}>
                通常
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                addTab === 'combination' && styles.tabButtonActive,
                !canUseCombinationTab && styles.tabButtonDisabled,
              ]}
              onPress={() => {
                if (!canUseCombinationTab) return;
                setAddTab('combination');
              }}
              disabled={!canUseCombinationTab}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  addTab === 'combination' && styles.tabButtonTextActive,
                  !canUseCombinationTab && styles.tabButtonTextDisabled,
                ]}
              >
                組み合わせ
              </Text>
            </TouchableOpacity>
          </View>
          {!canUseCombinationTab && (
            <Text style={styles.disabledHint}>単勝・複勝は通常入力のみ対応です</Text>
          )}

          {addTab === 'normal' || !canUseCombinationTab ? (
            <>
              <Text style={styles.sectionLabel}>馬を選択（{typeConfig.horseCount}頭）</Text>
              {horses.map(horse => (
                <TouchableOpacity
                  key={horse.id}
                  style={[
                    styles.horseOption,
                    normalHorseIds.includes(horse.id) && styles.horseOptionActive,
                  ]}
                  onPress={() => toggleNormalHorse(horse.id)}
                >
                  <Text
                    style={[
                      styles.horseOptionName,
                      normalHorseIds.includes(horse.id) && styles.horseOptionNameActive,
                    ]}
                  >
                    {horse.name}
                  </Text>
                  <Text
                    style={[
                      styles.horseOptionStats,
                      normalHorseIds.includes(horse.id) && styles.horseOptionStatsActive,
                    ]}
                  >
                    勝率{horse.winRate.toFixed(1)}% / 複勝率{horse.placeRate.toFixed(1)}%
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <>
              <Text style={styles.sectionLabel}>組み合わせ方式</Text>
              <View style={styles.typeGrid}>
                {COMBINATION_MODES.map(mode => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.typeOption, combinationMode === mode && styles.typeOptionActive]}
                    onPress={() => setCombinationMode(mode)}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        combinationMode === mode && styles.typeOptionTextActive,
                      ]}
                    >
                      {MODE_LABELS[mode]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {supportsMulti && (
                <TouchableOpacity style={styles.multiToggle} onPress={() => setMulti(prev => !prev)}>
                  <Text style={styles.multiText}>{multi ? 'マルチ: ON' : 'マルチ: OFF'}</Text>
                </TouchableOpacity>
              )}

              {combinationMode === 'nagashi' && (
                <>
                  <Text style={styles.sectionLabel}>軸馬（1頭）</Text>
                  {horses.map(horse => (
                    <TouchableOpacity
                      key={`axis-${horse.id}`}
                      style={[styles.horseOption, nagashiAxis === horse.id && styles.horseOptionActive]}
                      onPress={() => {
                        setNagashiAxis(prev => (prev === horse.id ? '' : horse.id));
                        setNagashiOpponents(prev => prev.filter(id => id !== horse.id));
                      }}
                    >
                      <Text
                        style={[
                          styles.horseOptionName,
                          nagashiAxis === horse.id && styles.horseOptionNameActive,
                        ]}
                      >
                        {horse.name}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  <Text style={styles.sectionLabel}>相手馬（複数可）</Text>
                  {horses.map(horse => {
                    const selected = nagashiOpponents.includes(horse.id);
                    const disabled = nagashiAxis === horse.id;

                    return (
                      <TouchableOpacity
                        key={`opp-${horse.id}`}
                        style={[
                          styles.horseOption,
                          selected && styles.horseOptionActive,
                          disabled && styles.horseOptionDisabled,
                        ]}
                        onPress={() => toggleNagashiOpponent(horse.id)}
                        disabled={disabled}
                      >
                        <Text
                          style={[
                            styles.horseOptionName,
                            selected && styles.horseOptionNameActive,
                            disabled && styles.horseOptionNameDisabled,
                          ]}
                        >
                          {horse.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {combinationMode === 'box' && (
                <>
                  <Text style={styles.sectionLabel}>BOX対象馬（{typeConfig.horseCount}頭以上）</Text>
                  {horses.map(horse => {
                    const selected = boxHorseIds.includes(horse.id);
                    return (
                      <TouchableOpacity
                        key={`box-${horse.id}`}
                        style={[styles.horseOption, selected && styles.horseOptionActive]}
                        onPress={() => toggleBoxHorse(horse.id)}
                      >
                        <Text
                          style={[
                            styles.horseOptionName,
                            selected && styles.horseOptionNameActive,
                          ]}
                        >
                          {horse.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {combinationMode === 'formation' && (
                <>
                  {formationFrames.map((frame, frameIndex) => (
                    <View key={`frame-${frameIndex}`} style={styles.formationSection}>
                      <Text style={styles.sectionLabel}>{frameIndex + 1}列目</Text>
                      {horses.map(horse => {
                        const selected = frame.includes(horse.id);
                        return (
                          <TouchableOpacity
                            key={`frame-${frameIndex}-${horse.id}`}
                            style={[styles.horseOption, selected && styles.horseOptionActive]}
                            onPress={() => toggleFormationHorse(frameIndex, horse.id)}
                          >
                            <Text
                              style={[
                                styles.horseOptionName,
                                selected && styles.horseOptionNameActive,
                              ]}
                            >
                              {horse.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </>
              )}
            </>
          )}

          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>生成プレビュー</Text>
            <Text style={styles.previewCount}>点数: {preview.length}点</Text>
            {previewTop.length > 0 ? (
              previewTop.map((combination, index) => (
                <Text key={combination.key} style={styles.previewLine}>
                  {index + 1}.{' '}
                  {formatCombinationHorseNames(combination.horseIds, resolveHorseName, typeConfig.ordered)}
                </Text>
              ))
            ) : (
              <Text style={styles.previewLine}>条件を選択すると表示されます</Text>
            )}
          </View>
        </ScrollView>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#FFF',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  cancelBtn: {
    color: '#888',
    fontSize: 15,
  },
  doneBtn: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalContentContainer: {
    paddingBottom: 28,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFF',
  },
  typeOptionActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  typeOptionText: {
    fontSize: 14,
    color: '#555',
  },
  typeOptionTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 4,
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
  tabButtonText: {
    color: '#4C6758',
    fontSize: 14,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#FFF',
  },
  tabButtonTextDisabled: {
    color: '#A0A0A0',
  },
  disabledHint: {
    marginTop: 6,
    color: '#8A8A8A',
    fontSize: 12,
  },
  horseOption: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  horseOptionActive: {
    backgroundColor: LIGHT_GREEN,
    borderColor: GREEN,
  },
  horseOptionDisabled: {
    opacity: 0.5,
  },
  horseOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  horseOptionNameActive: {
    color: GREEN,
  },
  horseOptionNameDisabled: {
    color: '#999',
  },
  horseOptionStats: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  horseOptionStatsActive: {
    color: GREEN,
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
  formationSection: {
    marginTop: 4,
  },
  previewCard: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: '#FFF',
    padding: 12,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: GREEN,
    marginBottom: 4,
  },
  previewCount: {
    fontSize: 12,
    color: '#4C6758',
    marginBottom: 4,
  },
  previewLine: {
    fontSize: 12,
    color: '#22322B',
    marginTop: 2,
  },
});
