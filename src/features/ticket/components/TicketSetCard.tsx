import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ticket } from '../../../types';
import { getTicketTypeConfig } from '../constants';
import {
  formatCombinationHorseNames,
  formatPercentFromRate,
  formatTicketMeta,
  formatTicketSelectionSummary,
} from '../helpers';
import { TicketProbabilitySummary } from '../types';

const GREEN = '#006934';
const BORDER = '#B2D8C4';

interface TicketSetCardProps {
  ticket: Ticket;
  summary: TicketProbabilitySummary;
  resolveHorseName: (horseId: string) => string;
  onPress: () => void;
  onDelete: () => void;
}

export default function TicketSetCard({
  ticket,
  summary,
  resolveHorseName,
  onPress,
  onDelete,
}: TicketSetCardProps) {
  const config = getTicketTypeConfig(ticket.type);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.headerRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{ticket.type}</Text>
        </View>
        <TouchableOpacity
          onPress={event => {
            event.stopPropagation();
            onDelete();
          }}
        >
          <Text style={styles.deleteText}>削除</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.metaText}>{formatTicketMeta(ticket)}</Text>
      <Text style={styles.summaryText}>{formatTicketSelectionSummary(ticket, resolveHorseName)}</Text>

      <View style={styles.rateRow}>
        <Text style={styles.meanLabel}>平均的中率</Text>
        <Text style={styles.meanValue}>{formatPercentFromRate(summary.meanProbability)}</Text>
      </View>

      <Text style={styles.topLabel}>上位3点</Text>
      {summary.topCombinations.length === 0 ? (
        <Text style={styles.emptyText}>フォーメーションがありません</Text>
      ) : (
        summary.topCombinations.map((combination, index) => (
          <View key={combination.key} style={styles.comboRow}>
            <Text style={styles.comboName}>
              {index + 1}.{' '}
              {formatCombinationHorseNames(combination.horseIds, resolveHorseName, config.ordered)}
            </Text>
            <Text style={styles.comboRate}>{formatPercentFromRate(combination.probability)}</Text>
          </View>
        ))
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: GREEN,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteText: {
    fontSize: 12,
    color: '#E53935',
  },
  metaText: {
    fontSize: 12,
    color: '#6A7A71',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    color: '#22322B',
    marginBottom: 10,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E3ECE7',
    borderBottomWidth: 1,
    borderBottomColor: '#E3ECE7',
  },
  meanLabel: {
    color: '#4C6758',
    fontSize: 12,
    fontWeight: '700',
  },
  meanValue: {
    color: GREEN,
    fontSize: 16,
    fontWeight: '700',
  },
  topLabel: {
    color: '#4C6758',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  comboRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    gap: 10,
  },
  comboName: {
    flex: 1,
    color: '#22322B',
    fontSize: 12,
  },
  comboRate: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: '#9AA8A0',
    fontSize: 12,
  },
});
