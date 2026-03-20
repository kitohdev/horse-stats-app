import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const GREEN = '#006934';
const BORDER = '#B2D8C4';

type ProbabilityNoticeMode = 'required' | 'info';

interface ProbabilityNoticeModalProps {
  visible: boolean;
  mode: ProbabilityNoticeMode;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ProbabilityNoticeModal({
  visible,
  mode,
  onClose,
  onConfirm,
}: ProbabilityNoticeModalProps) {
  const isRequired = mode === 'required';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={() => {
        if (!isRequired) {
          onClose();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>確率について</Text>
          <Text style={styles.message}>
            このアプリの確率は単純な確率計算に基づく参考値です。実際の結果・数値とは相違がある場合があります。
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              if (isRequired) {
                onConfirm();
                return;
              }
              onClose();
            }}
          >
            <Text style={styles.buttonText}>{isRequired ? '確認しました' : '閉じる'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22322B',
    marginBottom: 10,
  },
  message: {
    fontSize: 13,
    color: '#374D41',
    lineHeight: 20,
    marginBottom: 14,
  },
  button: {
    alignSelf: 'flex-end',
    backgroundColor: GREEN,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
