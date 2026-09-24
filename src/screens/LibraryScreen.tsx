import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import BookCard from '../components/BookCard';
import { bookRepository } from '../composition/repositories';
import type { ReadingStatus } from '../domain/entities/LibraryEntry';
import type { LibraryStackParamList } from '../navigation/types';
import { useAppSelector } from '../store/hooks';
import { colors, radius, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<LibraryStackParamList, 'LibraryHome'>;

// "Aimé" n'est pas un statut de lecture (voir LibraryEntry.liked) — indépendant,
// un livre "à lire" peut très bien être aimé — donc un onglet à part plutôt
// qu'une valeur de plus dans ReadingStatus.
type TabValue = ReadingStatus | 'liked';

const TABS: { value: TabValue; label: string }[] = [
  { value: 'to_read', label: 'À lire' },
  { value: 'reading', label: 'En cours' },
  { value: 'read', label: 'Lu' },
  { value: 'liked', label: 'Aimé' },
];

type SortMode = 'date' | 'rating';

function matchesTab(entry: { status: ReadingStatus; liked?: boolean }, tab: TabValue): boolean {
  return tab === 'liked' ? !!entry.liked : entry.status === tab;
}

export default function LibraryScreen({ navigation }: Props) {
  const entries = useAppSelector((state) => state.library.entries);
  const [activeTab, setActiveTab] = useState<TabValue>('to_read');
  const [sortMode, setSortMode] = useState<SortMode>('date');

  const filtered = useMemo(() => {
    const inTab = entries.filter((e) => matchesTab(e, activeTab));
    return [...inTab].sort((a, b) => {
      if (sortMode === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });
  }, [entries, activeTab, sortMode]);

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        {TABS.map((tab) => {
          const count = entries.filter((e) => matchesTab(e, tab.value)).length;
          const active = tab.value === activeTab;
          return (
            <Pressable
              key={tab.value}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab.value)}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label} ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.sortButton} onPress={() => setSortMode((m) => (m === 'date' ? 'rating' : 'date'))}>
        <Ionicons name="swap-vertical" size={14} color={colors.secondaryText} />
        <Text style={styles.sortButtonText}>Trié par {sortMode === 'date' ? "date d'ajout" : 'note'}</Text>
      </Pressable>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Rien ici pour l'instant.</Text>}
        renderItem={({ item }) => (
          <BookCard
            title={item.title}
            authors={item.authors}
            coverUrl={item.coverUrl ?? bookRepository.coverUrl(item.coverId, 'M')}
            onPress={() =>
              navigation.navigate('BookDetail', {
                workKey: item.id,
                presetWorkKeys: item.workKeys,
                presetTitle: item.title,
                presetAuthors: item.authors,
                presetCoverId: item.coverId,
                presetCoverUrl: item.coverUrl,
                presetDescription: item.description,
                presetLanguages: item.languages,
              })
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.accentOrange,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  tabLabelActive: {
    color: colors.background,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  sortButtonText: {
    ...typography.body,
    marginLeft: spacing.xs,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  row: {
    justifyContent: 'space-between',
  },
  empty: {
    ...typography.body,
    marginTop: spacing.xl,
  },
});
