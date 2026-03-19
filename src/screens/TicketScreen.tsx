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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { loadHorses, loadTickets, saveTicket, deleteTicket } from '../store/horses';
import { Horse, Ticket, TicketType } from '../types';

const GREEN = '#006934';
const LIGHT_GREEN = '#E8F5EE';
const BORDER = '#B2D8C4';

const TICKET_TYPES: { type: TicketType; horseCount: number }[] = [
  { type: '単勝', horseCount: 1 },
  { type: '複勝', horseCount: 1 },
  { type: '馬連', horseCount: 2 },
  { type: '馬単', horseCount: 2 },
  { type: 'ワイド', horseCount: 2 },
  { type: '三連複', horseCount: 3 },
  { type: '三連単', horseCount: 3 },
];

export default function TicketScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<TicketType>('単勝');
  const [selectedHorseIds, setSelectedHorseIds] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadTickets().then(setTickets);
      loadHorses().then(setHorses);
    }, [])
  );

  const requiredCount = TICKET_TYPES.find(t => t.type === selectedType)?.horseCount ?? 1;

  function toggleHorse(id: string) {
    setSelectedHorseIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= requiredCount) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  async function handleAdd() {
    if (selectedHorseIds.length !== requiredCount) {
      Alert.alert(`${requiredCount}頭選択してください`);
      return;
    }
    const ticket: Ticket = {
      id: Date.now().toString(),
      type: selectedType,
      horses: selectedHorseIds,
      memo: '',
      createdAt: Date.now(),
    };
    await saveTicket(ticket);
    setTickets(t => [...t, ticket]);
    setSelectedHorseIds([]);
    setModalVisible(false);
  }

  function horseName(id: string) {
    return horses.find(h => h.id === id)?.name ?? '?';
  }

  function handleDelete(ticket: Ticket) {
    Alert.alert('削除', 'この馬券を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive', onPress: async () => {
          await deleteTicket(ticket.id);
          setTickets(t => t.filter(x => x.id !== ticket.id));
        }
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>馬券リスト</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => {
          setSelectedHorseIds([]);
          setModalVisible(true);
        }}>
          <Text style={styles.addBtnText}>+ 追加</Text>
        </TouchableOpacity>
      </View>

      {tickets.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>馬券がありません</Text>
          <Text style={styles.emptySubText}>「+ 追加」ボタンから馬券を作成しましょう</Text>
        </View>
      ) : (
        <FlatList
          data={[...tickets].reverse()}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{item.type}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item)}>
                  <Text style={styles.deleteBtn}>削除</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.horseNames}>
                {item.horses.map(id => horseName(id)).join(' → ')}
              </Text>
              {item.horses.map(id => {
                const h = horses.find(x => x.id === id);
                if (!h) return null;
                return (
                  <Text key={id} style={styles.horseStats}>
                    {h.name}: 勝率{h.winRate.toFixed(1)}% / 複勝率{h.placeRate.toFixed(1)}%
                  </Text>
                );
              })}
            </View>
          )}
        />
      )}

      {/* Add Ticket Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelBtn}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>馬券を追加</Text>
            <TouchableOpacity onPress={handleAdd}>
              <Text style={styles.doneBtn}>追加</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Ticket type */}
            <Text style={styles.sectionLabel}>馬券種別</Text>
            <View style={styles.typeGrid}>
              {TICKET_TYPES.map(({ type }) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeOption, selectedType === type && styles.typeOptionActive]}
                  onPress={() => { setSelectedType(type); setSelectedHorseIds([]); }}
                >
                  <Text style={[styles.typeOptionText, selectedType === type && styles.typeOptionTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Horse selection */}
            <Text style={styles.sectionLabel}>
              馬を選択（{requiredCount}頭）
              {selectedHorseIds.length > 0 && `  選択中: ${selectedHorseIds.map(id => horseName(id)).join(', ')}`}
            </Text>
            {horses.length === 0 ? (
              <Text style={styles.noHorseText}>保存した馬がありません</Text>
            ) : (
              horses.map(h => (
                <TouchableOpacity
                  key={h.id}
                  style={[styles.horseOption, selectedHorseIds.includes(h.id) && styles.horseOptionActive]}
                  onPress={() => toggleHorse(h.id)}
                >
                  <Text style={[styles.horseOptionName, selectedHorseIds.includes(h.id) && styles.horseOptionNameActive]}>
                    {h.name}
                  </Text>
                  <Text style={[styles.horseOptionStats, selectedHorseIds.includes(h.id) && styles.horseOptionStatsActive]}>
                    勝率{h.winRate.toFixed(1)}% / 複勝率{h.placeRate.toFixed(1)}%
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: GREEN },
  addBtn: { backgroundColor: GREEN, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: '#888', marginBottom: 8 },
  emptySubText: { fontSize: 12, color: '#AAA' },
  ticketCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 10,
  },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { backgroundColor: GREEN, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  typeText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  deleteBtn: { fontSize: 12, color: '#E53935' },
  horseNames: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 6 },
  horseStats: { fontSize: 12, color: '#666', marginTop: 2 },
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
  modalContent: { flex: 1, padding: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: GREEN, marginBottom: 10, marginTop: 16 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFF',
  },
  typeOptionActive: { backgroundColor: GREEN, borderColor: GREEN },
  typeOptionText: { fontSize: 14, color: '#555' },
  typeOptionTextActive: { color: '#FFF', fontWeight: '600' },
  horseOption: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  horseOptionActive: { backgroundColor: LIGHT_GREEN, borderColor: GREEN },
  horseOptionName: { fontSize: 15, fontWeight: '600', color: '#222' },
  horseOptionNameActive: { color: GREEN },
  horseOptionStats: { fontSize: 12, color: '#888', marginTop: 2 },
  horseOptionStatsActive: { color: GREEN },
  noHorseText: { color: '#AAA', fontSize: 13, textAlign: 'center', marginTop: 20 },
});
