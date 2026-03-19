import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { loadHorses, deleteHorse } from '../store/horses';
import { Horse } from '../types';

const GREEN = '#006934';
const LIGHT_GREEN = '#E8F5EE';
const BORDER = '#B2D8C4';

type SortKey = 'winRate' | 'placeRate' | 'totalRaces' | 'createdAt';

export default function HorsesScreen() {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');

  useFocusEffect(
    useCallback(() => {
      loadHorses().then(setHorses);
    }, [])
  );

  const sorted = [...horses].sort((a, b) => {
    if (sortKey === 'createdAt') return b.createdAt - a.createdAt;
    return b[sortKey] - a[sortKey];
  });

  function handleDelete(horse: Horse) {
    Alert.alert('削除', `${horse.name} を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive', onPress: async () => {
          await deleteHorse(horse.id);
          setHorses(h => h.filter(x => x.id !== horse.id));
        }
      },
    ]);
  }

  const SORTS: { key: SortKey; label: string }[] = [
    { key: 'createdAt', label: '登録順' },
    { key: 'winRate', label: '勝率' },
    { key: 'placeRate', label: '複勝率' },
    { key: 'totalRaces', label: 'レース数' },
  ];

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
          <Text style={styles.emptySubText}>入力タブから戦歴を入力して保存しましょう</Text>
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
                <TouchableOpacity onPress={() => handleDelete(item)}>
                  <Text style={styles.deleteBtn}>削除</Text>
                </TouchableOpacity>
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
  horseName: { fontSize: 17, fontWeight: '700', color: '#222' },
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
});
