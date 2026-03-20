import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PAGE_SIZE_OPTIONS } from '../constants';
import { PageSizeOption } from '../types';

const GREEN = '#006934';
const BORDER = '#B2D8C4';

interface PaginationControlsProps {
  totalItems: number;
  pageSize: PageSizeOption;
  currentPage: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  onChangePageSize: (size: PageSizeOption) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

function pageSizeLabel(option: PageSizeOption): string {
  if (option === 'all') return '全件';
  return String(option);
}

export default function PaginationControls({
  totalItems,
  pageSize,
  currentPage,
  totalPages,
  pageStart,
  pageEnd,
  onChangePageSize,
  onPrevPage,
  onNextPage,
}: PaginationControlsProps) {
  if (totalItems === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.sizeRow}>
        {PAGE_SIZE_OPTIONS.map(option => (
          <TouchableOpacity
            key={String(option)}
            style={[styles.sizeButton, pageSize === option && styles.sizeButtonActive]}
            onPress={() => onChangePageSize(option)}
          >
            <Text style={[styles.sizeButtonText, pageSize === option && styles.sizeButtonTextActive]}>
              {pageSizeLabel(option)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.pageInfo}>
          {pageStart} - {pageEnd} / {totalItems}件
        </Text>
        {pageSize !== 'all' && totalPages > 1 && (
          <View style={styles.pagerButtons}>
            <TouchableOpacity
              style={[styles.pagerButton, currentPage <= 1 && styles.pagerButtonDisabled]}
              onPress={onPrevPage}
              disabled={currentPage <= 1}
            >
              <Text style={[styles.pagerButtonText, currentPage <= 1 && styles.pagerButtonTextDisabled]}>
                前へ
              </Text>
            </TouchableOpacity>
            <Text style={styles.currentPage}>{currentPage} / {totalPages}</Text>
            <TouchableOpacity
              style={[styles.pagerButton, currentPage >= totalPages && styles.pagerButtonDisabled]}
              onPress={onNextPage}
              disabled={currentPage >= totalPages}
            >
              <Text
                style={[styles.pagerButtonText, currentPage >= totalPages && styles.pagerButtonTextDisabled]}
              >
                次へ
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  sizeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  sizeButton: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFF',
  },
  sizeButtonActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  sizeButtonText: {
    color: '#4C6758',
    fontSize: 12,
    fontWeight: '700',
  },
  sizeButtonTextActive: {
    color: '#FFF',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageInfo: {
    fontSize: 12,
    color: '#4C6758',
  },
  pagerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pagerButton: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFF',
  },
  pagerButtonDisabled: {
    backgroundColor: '#F1F1F1',
    borderColor: '#D7D7D7',
  },
  pagerButtonText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '700',
  },
  pagerButtonTextDisabled: {
    color: '#9A9A9A',
  },
  currentPage: {
    color: '#4C6758',
    fontSize: 12,
    fontWeight: '700',
  },
});
