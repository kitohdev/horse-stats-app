import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { calcStats, saveHorse } from '../store/horses';
import { Horse } from '../types';

const GREEN = '#006934';
const LIGHT_GREEN = '#E8F5EE';
const BORDER = '#B2D8C4';

interface Props {
  onSaved?: () => void;
}

export default function InputScreen({ onSaved }: Props) {
  const [name, setName] = useState('');
  const [wins, setWins] = useState('');
  const [second, setSecond] = useState('');
  const [third, setThird] = useState('');
  const [other, setOther] = useState('');

  const w = parseInt(wins) || 0;
  const s = parseInt(second) || 0;
  const t = parseInt(third) || 0;
  const o = parseInt(other) || 0;
  const stats = calcStats(w, s, t, o);

  const hasInput = w + s + t + o > 0;

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('馬名を入力してください');
      return;
    }
    if (!hasInput) {
      Alert.alert('戦歴を入力してください');
      return;
    }
    const horse: Horse = {
      id: Date.now().toString(),
      name: name.trim(),
      wins: w,
      second: s,
      third: t,
      other: o,
      ...stats,
      createdAt: Date.now(),
    };
    await saveHorse(horse);
    Alert.alert('保存しました', `${horse.name} を保存しました`);
    setName('');
    setWins('');
    setSecond('');
    setThird('');
    setOther('');
    onSaved?.();
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>戦歴入力</Text>
        <Text style={styles.subtitle}>例: (4.3.2.1) = 4勝3着2着3着4着以下1回</Text>

        {/* 馬名 */}
        <View style={styles.card}>
          <Text style={styles.label}>馬名</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="例: ディープインパクト"
            placeholderTextColor="#AAA"
          />
        </View>

        {/* 戦歴入力 */}
        <View style={styles.card}>
          <Text style={styles.label}>戦歴</Text>
          <View style={styles.row}>
            {[
              { label: '1着', value: wins, set: setWins },
              { label: '2着', value: second, set: setSecond },
              { label: '3着', value: third, set: setThird },
              { label: '着外', value: other, set: setOther },
            ].map(({ label, value, set }) => (
              <View key={label} style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{label}</Text>
                <TextInput
                  style={styles.numInput}
                  value={value}
                  onChangeText={set}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#AAA"
                  maxLength={4}
                />
              </View>
            ))}
          </View>
          <Text style={styles.hint}>
            {hasInput ? `${stats.totalRaces}戦` : '数値を入力してください'}
          </Text>
        </View>

        {/* 結果 */}
        {hasInput && (
          <View style={styles.resultCard}>
            <View style={styles.resultRow}>
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>勝率</Text>
                <Text style={styles.resultValue}>{stats.winRate.toFixed(1)}%</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>複勝率</Text>
                <Text style={styles.resultValue}>{stats.placeRate.toFixed(1)}%</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>総レース</Text>
                <Text style={styles.resultValue}>{stats.totalRaces}戦</Text>
              </View>
            </View>
          </View>
        )}

        {/* 保存ボタン */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>この馬を保存する</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F8' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: GREEN, marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#888', marginBottom: 20 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 12,
  },
  label: { fontSize: 13, fontWeight: '600', color: GREEN, marginBottom: 8 },
  input: {
    fontSize: 16,
    color: '#222',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
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
    marginBottom: 20,
  },
  resultRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  resultItem: { alignItems: 'center' },
  resultLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  resultValue: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  resultDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)' },
  saveButton: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
