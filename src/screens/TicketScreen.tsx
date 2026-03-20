import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { deleteTicket, loadHorses, loadTickets, saveTicket } from '../store/horses';
import { Horse, Ticket } from '../types';
import TicketAddModal from '../features/ticket/components/TicketAddModal';
import PaginationControls from '../features/ticket/components/PaginationControls';
import TicketDetailModal from '../features/ticket/components/TicketDetailModal';
import TicketSetCard from '../features/ticket/components/TicketSetCard';
import { calculateTicketProbabilitySummary } from '../features/ticket/probability';
import { PageSizeOption, TicketProbabilitySummary } from '../features/ticket/types';

const GREEN = '#006934';

export default function TicketScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [detailTicketId, setDetailTicketId] = useState<string | null>(null);

  const [pageSize, setPageSize] = useState<PageSizeOption>(100);
  const [pageIndex, setPageIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      Promise.all([loadTickets(), loadHorses()])
        .then(([ticketData, horseData]) => {
          if (!mounted) return;
          setTickets(ticketData);
          setHorses(horseData);
        })
        .catch(() => {
          if (!mounted) return;
          Alert.alert('読み込みエラー', '馬券データの読み込みに失敗しました');
          setTickets([]);
          setHorses([]);
        });

      return () => {
        mounted = false;
      };
    }, [])
  );

  const horsesById = useMemo(() => new Map(horses.map(horse => [horse.id, horse])), [horses]);

  const sortedTickets = useMemo(
    () => [...tickets].sort((left, right) => right.createdAt - left.createdAt),
    [tickets]
  );

  const probabilitySummaryById = useMemo(() => {
    const entries: Array<[string, TicketProbabilitySummary]> = sortedTickets.map(ticket => [
      ticket.id,
      calculateTicketProbabilitySummary(ticket, horsesById, 3),
    ]);

    return new Map<string, TicketProbabilitySummary>(entries);
  }, [horsesById, sortedTickets]);

  const totalItems = sortedTickets.length;
  const totalPages =
    pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (pageIndex < totalPages) return;
    setPageIndex(Math.max(0, totalPages - 1));
  }, [pageIndex, totalPages]);

  const startIndex =
    pageSize === 'all' ? 0 : Math.min(pageIndex, Math.max(0, totalPages - 1)) * pageSize;

  const paginatedTickets =
    pageSize === 'all'
      ? sortedTickets
      : sortedTickets.slice(startIndex, startIndex + pageSize);

  const pageStart = totalItems === 0 ? 0 : startIndex + 1;
  const pageEnd = totalItems === 0 ? 0 : startIndex + paginatedTickets.length;

  const detailSummary =
    detailTicketId === null ? null : probabilitySummaryById.get(detailTicketId) ?? null;

  const resolveHorseName = useCallback(
    (horseId: string) => horsesById.get(horseId)?.name ?? '?',
    [horsesById]
  );

  function handleChangePageSize(nextPageSize: PageSizeOption): void {
    setPageSize(nextPageSize);
    setPageIndex(0);
  }

  function handlePrevPage(): void {
    setPageIndex(prev => Math.max(0, prev - 1));
  }

  function handleNextPage(): void {
    setPageIndex(prev => Math.min(totalPages - 1, prev + 1));
  }

  async function handleSubmitTicket(ticket: Ticket): Promise<void> {
    await saveTicket(ticket);
    setTickets(prev => [...prev, ticket]);
    setIsAddModalVisible(false);
  }

  function handleDelete(ticket: Ticket): void {
    Alert.alert('削除', 'この購入セットを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTicket(ticket.id);
            setTickets(prev => prev.filter(current => current.id !== ticket.id));
            if (detailTicketId === ticket.id) {
              setDetailTicketId(null);
            }
          } catch {
            Alert.alert('削除に失敗しました', '時間をおいて再試行してください');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>馬券リスト</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddModalVisible(true)}>
          <Text style={styles.addBtnText}>+ 追加</Text>
        </TouchableOpacity>
      </View>

      {tickets.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>馬券がありません</Text>
          <Text style={styles.emptySubText}>「+ 追加」ボタンから馬券を作成しましょう</Text>
        </View>
      ) : (
        <>
          <PaginationControls
            totalItems={totalItems}
            pageSize={pageSize}
            currentPage={pageSize === 'all' ? 1 : pageIndex + 1}
            totalPages={totalPages}
            pageStart={pageStart}
            pageEnd={pageEnd}
            onChangePageSize={handleChangePageSize}
            onPrevPage={handlePrevPage}
            onNextPage={handleNextPage}
          />

          <FlatList
            data={paginatedTickets}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const summary =
                probabilitySummaryById.get(item.id) ??
                calculateTicketProbabilitySummary(item, horsesById, 3);

              return (
                <TicketSetCard
                  ticket={item}
                  summary={summary}
                  resolveHorseName={resolveHorseName}
                  onPress={() => setDetailTicketId(item.id)}
                  onDelete={() => handleDelete(item)}
                />
              );
            }}
          />
        </>
      )}

      <TicketAddModal
        visible={isAddModalVisible}
        horses={horses}
        onClose={() => setIsAddModalVisible(false)}
        onSubmitTicket={handleSubmitTicket}
      />

      <TicketDetailModal
        visible={detailSummary !== null}
        summary={detailSummary}
        resolveHorseName={resolveHorseName}
        onClose={() => setDetailTicketId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9F8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: GREEN,
  },
  addBtn: {
    backgroundColor: GREEN,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 12,
    color: '#AAA',
  },
});
