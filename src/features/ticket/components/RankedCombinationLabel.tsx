import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

interface RankedCombinationLabelProps {
  rank: number;
  text: string;
  containerStyle?: ViewStyle;
  rankStyle?: TextStyle;
  textStyle?: TextStyle;
}

export default function RankedCombinationLabel({
  rank,
  text,
  containerStyle,
  rankStyle,
  textStyle,
}: RankedCombinationLabelProps) {
  return (
    <View style={[styles.row, containerStyle]}>
      <Text style={[styles.rank, rankStyle]}>{rank}:</Text>
      <Text style={[styles.text, textStyle]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  rank: {
    width: 24,
    textAlign: 'right',
    marginRight: 4,
    fontVariant: ['tabular-nums'],
  },
  text: {
    flex: 1,
  },
});
