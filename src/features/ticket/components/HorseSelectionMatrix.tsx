import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const BLUE = '#2F5CB7';
const BLUE_LIGHT = '#EAF0FD';
const BORDER = '#C8D6F3';

export interface HorseSelectionColumn {
  key: string;
  label: string;
  controlType?: 'checkbox' | 'radio';
}

export interface HorseSelectionRow {
  id: string;
  label: string;
  subLabelTop?: string;
  subLabelBottom?: string;
}

interface HorseSelectionMatrixProps {
  horses: readonly HorseSelectionRow[];
  columns: readonly HorseSelectionColumn[];
  selectedByColumn: Readonly<Record<string, readonly string[]>>;
  onToggleCell: (columnKey: string, horseId: string) => void;
  isCellDisabled?: (columnKey: string, horseId: string) => boolean;
  horseHeaderLabel?: string;
}

export default function HorseSelectionMatrix({
  horses,
  columns,
  selectedByColumn,
  onToggleCell,
  isCellDisabled,
  horseHeaderLabel = '馬',
}: HorseSelectionMatrixProps) {
  return (
    <View style={styles.table}>
      <View style={styles.headerRow}>
        <View style={[styles.horseCell, styles.headerCell]}>
          <Text style={styles.headerText}>{horseHeaderLabel}</Text>
        </View>
        {columns.map(column => (
          <View key={column.key} style={[styles.selectCell, styles.headerCell]}>
            <Text style={styles.headerText}>{column.label}</Text>
          </View>
        ))}
      </View>

      {horses.map(horse => (
        <View key={horse.id} style={styles.bodyRow}>
          <View style={styles.horseCell}>
            <Text style={styles.horseText}>{horse.label}</Text>
            {horse.subLabelTop ? <Text style={styles.horseSubText}>{horse.subLabelTop}</Text> : null}
            {horse.subLabelBottom ? <Text style={styles.horseSubText}>{horse.subLabelBottom}</Text> : null}
          </View>
          {columns.map(column => {
            const selected = (selectedByColumn[column.key] ?? []).includes(horse.id);
            const disabled = isCellDisabled?.(column.key, horse.id) ?? false;
            const isRadio = column.controlType === 'radio';

            return (
              <View key={`${column.key}-${horse.id}`} style={styles.selectCell}>
                <TouchableOpacity
                  style={[
                    isRadio ? styles.radio : styles.checkbox,
                    isRadio ? selected && styles.radioSelected : selected && styles.checkboxSelected,
                    disabled && styles.checkboxDisabled,
                  ]}
                  onPress={() => onToggleCell(column.key, horse.id)}
                  disabled={disabled}
                  activeOpacity={0.8}
                >
                  {selected && (isRadio ? <View style={styles.radioDot} /> : <Text style={styles.checkmark}>✓</Text>)}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: BLUE,
  },
  bodyRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E6ECF9',
    minHeight: 58,
  },
  horseCell: {
    flex: 2.4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  selectCell: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#E6ECF9',
  },
  headerCell: {
    borderLeftColor: '#4A71C6',
  },
  headerText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  horseText: {
    color: '#233252',
    fontSize: 13,
    fontWeight: '600',
  },
  horseSubText: {
    color: '#4F6289',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: BLUE,
    backgroundColor: BLUE_LIGHT,
  },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: BORDER,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: BLUE,
    backgroundColor: '#FFF',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: BLUE,
  },
  checkboxDisabled: {
    opacity: 0.4,
  },
  checkmark: {
    color: BLUE,
    fontSize: 15,
    fontWeight: '800',
  },
});
