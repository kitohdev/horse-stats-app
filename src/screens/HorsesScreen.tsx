import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { calcStats, loadHorses, deleteHorse, saveHorse } from '../store/horses';
import { Horse } from '../types';
import { parseRaceCount, sanitizeRaceInput } from '../utils/raceInput';

const GREEN = '#006934';
const LIGHT_GREEN = '#E8F5EE';
const BORDER = '#B2D8C4';

type SortKey = 'winRate' | 'placeRate' | 'totalRaces' | 'createdAt';
type RaceField = 'wins' | 'second' | 'third' | 'other';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'createdAt', label: '登録順' },
  { key: 'winRate', label: '勝率' },
  { key: 'placeRate', label: '複勝率' },
  { key: 'totalRaces', label: 'レース数' },
];

const RACE_FIELD_LABELS: { key: RaceField; label: string }[] = [
  { key: 'wins', label: '1着' },
  { key: 'second', label: '2着' },
  { key: 'third', label: '3着' },
  { key: 'other', label: '着外' },
];

export default function HorsesScreen() {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [editingHorse, setEditingHorse] = useState<Horse | null>(null);
  const [editName, setEditName] = useState('');
  const [editWins, setEditWins] = useState('');
  const [editSecond, setEditSecond] = useState('');
  const [editThird, setEditThird] = useState('');
  const [editOther, setEditOther] = useState('');

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      loadHorses()
        .then(data => {
          if (mounted) setHorses(data);
        })
        .catch(() => {
          if (mounted) {
            Alert.alert('読み込みエラー', '馬一覧の読み込みに失敗しました');
            setHorses([]);
          }
        });

      return () => {
        mounted = false;
      };
    }, [])
  );

  const sorted = [...horses].sort((a, b) => {
    if (sortKey === 'createdAt') return b.createdAt - a.createdAt;
    return b[sortKey] - a[sortKey];
  });

  const editWinsParsed = parseRaceCount(editWins);
  const editSecondParsed = parseRaceCount(editSecond);
  const editThirdParsed = parseRaceCount(editThird);
  const editOtherParsed = parseRaceCount(editOther);

  const editRaceValues = {
    wins: editWinsParsed.value,
    second: editSecondParsed.value,
    third: editThirdParsed.value,
    other: editOtherParsed.value,
  };

  const hasEditInvalidInput =
    !editWinsParsed.valid ||
    !editSecondParsed.valid ||
    !editThirdParsed.valid ||
    !editOtherParsed.valid;
  const hasEditInput =
    !hasEditInvalidInput &&
    editRaceValues.wins + editRaceValues.second + editRaceValues.third + editRaceValues.other > 0;
  const editStats = calcStats(
    editRaceValues.wins,
    editRaceValues.second,
    editRaceValues.third,
    editRaceValues.other
  );
  const editFieldValues: Record<RaceField, string> = {
    wins: editWins,
    second: editSecond,
    third: editThird,
    other: editOther,
  };
  const editFieldSetters: Record<RaceField, (value: string) => void> = {
    wins: setEditWins,
    second: setEditSecond,
    third: setEditThird,
    other: setEditOther,
  };

  function openEditModal(horse: Horse) {
    setEditingHorse(horse);
    setEditName(horse.name);
    setEditWins(String(horse.wins));
    setEditSecond(String(horse.second));
    setEditThird(String(horse.third));
    setEditOther(String(horse.other));
  }

  function closeEditModal() {
    setEditingHorse(null);
    setEditName('');
    setEditWins('');
    setEditSecond('');
    setEditThird('');
    setEditOther('');
  }

  async function handleEditSave() {
    if (!editingHorse) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      Alert.alert('馬名を入力してください');
      return;
    }
    if (hasEditInvalidInput) {
      Alert.alert('戦績は0以上の整数で入力してください');
      return;
    }
    if (!hasEditInput) {
      Alert.alert('戦績を入力してください');
      return;
    }

    const updatedHorse: Horse = {
      ...editingHorse,
      name: trimmedName,
      wins: editRaceValues.wins,
      second: editRaceValues.second,
      third: editRaceValues.third,
      other: editRaceValues.other,
      ...editStats,
    };

    try {
      await saveHorse(updatedHorse);
      setHorses(prev => prev.map(h => (h.id === updatedHorse.id ? updatedHorse : h)));
      closeEditModal();
      Alert.alert('更新しました', `${updatedHorse.name} を更新しました`);
    } catch {
      Alert.alert('更新に失敗しました', '時間をおいて再試行してください');
    }
  }

  function handleDelete(horse: Horse) {
    Alert.alert('削除', `${horse.name} を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive', onPress: async () => {
          try {
            await deleteHorse(horse.id);
            setHorses(h => h.filter(x => x.id !== horse.id));
          } catch {
            Alert.alert('削除に失敗しました', '時間をおいて再試行してください');
          }
        }
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>保存した馬</Text>

      {/* Sort tabs */}
      <View style={styles.sortRow}>
        {SORTS.map(s => (
          <TouchableOpacity
            key={s.key}
            style={[styles.sortTab, sortKey === s.key && styles.sortTabActive]}
            onPress={() => setSortKey(s.key)}
          >
            <Text style={[styles.sortTabText, sortKey === s.key && styles.sortTabTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>まだ馬が保存されていません</Text>
          <Text style={styles.emptySubText}>入力タブから戦績を入力して保存しましょう</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.horseName}>{item.name}</Text>
                <View style={styles.actionsRow}>
                  <TouchableOpacity onPress={() => openEditModal(item)}>
                    <Text style={styles.editBtn}>編集</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)}>
                    <Text style={styles.deleteBtn}>削除</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.record}>
                {item.wins}-{item.second}-{item.third}-{item.other}（{item.totalRaces}戦）
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statBadge}>
                  <Text style={styles.statLabel}>勝率</Text>
                  <Text style={styles.statValue}>{item.winRate.toFixed(1)}%</Text>
                </View>
                <View style={styles.statBadge}>
                  <Text style={styles.statLabel}>複勝率</Text>
                  <Text style={styles.statValue}>{item.placeRate.toFixed(1)}%</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}

      <Modal
        visible={editingHorse !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modal}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeEditModal}>
              <Text style={styles.cancelBtn}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>馬を編集</Text>
            <TouchableOpacity onPress={handleEditSave}>
              <Text style={styles.doneBtn}>保存</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentContainer}>
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>馬名</Text>
              <TextInput
                style={styles.nameInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="例: ディープインパクト"
                placeholderTextColor="#AAA"
              />
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formLabel}>戦績</Text>
              <View style={styles.inputRow}>
                {RACE_FIELD_LABELS.map(field => {
                  const value = editFieldValues[field.key];
                  const onChange = editFieldSetters[field.key];

                  return (
                    <View key={field.key} style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{field.label}</Text>
                      <TextInput
                        style={styles.numInput}
                        value={value}
                        onChangeText={text => onChange(sanitizeRaceInput(text))}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor="#AAA"
                        maxLength={4}
                      />
                    </View>
                  );
                })}
              </View>
              <Text style={styles.hint}>
                {hasEditInput
                  ? `${editStats.totalRaces}戦`
                  : hasEditInvalidInput
                    ? '0以上の整数で入力してください'
                    : '数値を入力してください'}
              </Text>
            </View>

            {hasEditInput && (
              <View style={styles.resultCard}>
                <View style={styles.resultRow}>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>勝率</Text>
                    <Text style={styles.resultValue}>{editStats.winRate.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.resultDivider} />
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>複勝率</Text>
                    <Text style={styles.resultValue}>{editStats.placeRate.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.resultDivider} />
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>総レース</Text>
                    <Text style={styles.resultValue}>{editStats.totalRaces}戦</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F8' },
  title: { fontSize: 22, fontWeight: '700', color: GREEN, padding: 16, paddingBottom: 8 },
  sortRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4, gap: 8 },
  sortTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFF',
  },
  sortTabActive: { backgroundColor: GREEN, borderColor: GREEN },
  sortTabText: { fontSize: 12, color: '#666' },
  sortTabTextActive: { color: '#FFF', fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: '#888', marginBottom: 8 },
  emptySubText: { fontSize: 12, color: '#AAA' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  actionsRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  horseName: { fontSize: 17, fontWeight: '700', color: '#222' },
  editBtn: { fontSize: 12, color: GREEN, fontWeight: '700' },
  deleteBtn: { fontSize: 12, color: '#E53935' },
  record: { fontSize: 13, color: '#666', marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBadge: {
    flex: 1,
    backgroundColor: LIGHT_GREEN,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: { fontSize: 11, color: GREEN, fontWeight: '600', marginBottom: 2 },
  statValue: { fontSize: 20, fontWeight: '800', color: GREEN },
  modal: { flex: 1, backgroundColor: '#F7F9F8' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#FFF',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  cancelBtn: { color: '#888', fontSize: 15 },
  doneBtn: { color: GREEN, fontSize: 15, fontWeight: '700' },
  modalContent: { flex: 1 },
  modalContentContainer: { padding: 16, paddingBottom: 40 },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 12,
  },
  formLabel: { fontSize: 13, fontWeight: '600', color: GREEN, marginBottom: 8 },
  nameInput: {
    fontSize: 16,
    color: '#222',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 6,
  },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
  inputGroup: { alignItems: 'center', flex: 1 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: GREEN, marginBottom: 6 },
  numInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    width: 60,
    paddingVertical: 8,
    backgroundColor: LIGHT_GREEN,
  },
  hint: { fontSize: 12, color: '#888', marginTop: 10, textAlign: 'right' },
  resultCard: {
    backgroundColor: GREEN,
    borderRadius: 10,
    padding: 20,
  },
  resultRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  resultItem: { alignItems: 'center' },
  resultLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  resultValue: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  resultDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)' },
});
