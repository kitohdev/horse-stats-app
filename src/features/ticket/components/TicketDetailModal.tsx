import React from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TicketProbabilitySummary } from '../types';
import { formatCombinationHorseNames, formatPercentFromRate, formatTicketMeta } from '../helpers';
import { getTicketTypeConfig } from '../constants';

const GREEN = '#006934';
const BORDER = '#B2D8C4';

interface TicketDetailModalProps {
  visible: boolean;
  summary: TicketProbabilitySummary | null;
  resolveHorseName: (horseId: string) => string;
  onClose: () => void;
}

export default function TicketDetailModal({
  visible,
  summary,
  resolveHorseName,
  onClose,
}: TicketDetailModalProps) {
  if (!summary) return null;

  const config = getTicketTypeConfig(summary.ticket.type);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>閉じる</Text>
          </TouchableOpacity>
          <Text style={styles.title}>フォーメーション詳細</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.typeText}>{summary.ticket.type}</Text>
          <Text style={styles.metaText}>{formatTicketMeta(summary.ticket)}</Text>
          <Text style={styles.meanText}>平均的中率: {formatPercentFromRate(summary.meanProbability)}</Text>
          <Text style={styles.countText}>総点数: {summary.combinations.length}点</Text>
        </View>

        <FlatList
          data={summary.combinations}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <Text style={styles.rowTitle}>
                {index + 1}.{' '}
                {formatCombinationHorseNames(item.horseIds, resolveHorseName, config.ordered)}
              </Text>
              <Text style={styles.rowRate}>{formatPercentFromRate(item.probability)}</Text>
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#FFF',
  },
  closeText: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    color: '#22322B',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,
  },
  summaryCard: {
    margin: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: '#FFF',
    padding: 12,
    gap: 4,
  },
  typeText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '700',
  },
  metaText: {
    color: '#6A7A71',
    fontSize: 12,
  },
  meanText: {
    color: '#22322B',
    fontSize: 13,
    fontWeight: '700',
  },
  countText: {
    color: '#4C6758',
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  row: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  rowTitle: {
    color: '#22322B',
    fontSize: 12,
    flex: 1,
  },
  rowRate: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '700',
  },
});
