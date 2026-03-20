import React from 'react';
import { View, Text, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { RACE_FIELD_LABELS } from '../../features/input/constants';
import { HorseInputValues, RaceField } from '../../features/input/types';
import { sanitizeRaceInput } from '../../utils/raceInput';

const GREEN = '#006934';
const LIGHT_GREEN = '#E8F5EE';
const BORDER = '#B2D8C4';

interface RaceInputsProps {
  values: Pick<HorseInputValues, RaceField>;
  onChangeField: (field: RaceField, value: string) => void;
  compact?: boolean;
  registerInputRef?: (field: RaceField, ref: TextInput | null) => void;
  onSubmitField?: (field: RaceField) => void;
  onFocusField?: (field: RaceField) => void;
  resolveReturnKeyType?: (field: RaceField) => TextInputProps['returnKeyType'];
}

export default function RaceInputs({
  values,
  onChangeField,
  compact = false,
  registerInputRef,
  onSubmitField,
  onFocusField,
  resolveReturnKeyType,
}: RaceInputsProps) {
  return (
    <View style={styles.row}>
      {RACE_FIELD_LABELS.map(({ field, label }) => (
        <View key={field} style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{label}</Text>
          <TextInput
            ref={ref => registerInputRef?.(field, ref)}
            style={[styles.numInput, compact && styles.compactNumInput]}
            value={values[field]}
            onChangeText={text => onChangeField(field, sanitizeRaceInput(text))}
            keyboardType="number-pad"
            showSoftInputOnFocus
            returnKeyType={resolveReturnKeyType?.(field) ?? 'next'}
            blurOnSubmit={false}
            onFocus={() => onFocusField?.(field)}
            onSubmitEditing={() => onSubmitField?.(field)}
            placeholder="0"
            placeholderTextColor="#AAA"
            maxLength={4}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
  compactNumInput: {
    width: 56,
    fontSize: 18,
    paddingVertical: 6,
  },
});
