import React, { useLayoutEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import BookCard from '../components/BookCard';
import { bookRepository } from '../composition/repositories';
import { useLibrarySync } from '../hooks/useLibrarySync';
import type { LibraryStackParamList } from '../navigation/types';
import { deleteList } from '../store/listsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { colors, radius, spacing, typography } from '../theme/theme';
import { readingCaption } from '../utils/readingCaption';

type Props = NativeStackScreenProps<LibraryStackParamList, 'ListDetail'>;

type SortMode = 'date' | 'rating';

/**
 * Contenu d'une liste de lecture — style "playlist ouverte" : titre de la
 * liste en en-tête, grille de livres en dessous. Extrait de l'ancien
 * `LibraryScreen` (qui affichait la liste active inline sous des onglets)
 * au moment où `LibraryScreen` est devenu une liste de "lignes playlist"
 * (une par liste) plutôt qu'une grille avec sélecteur — voir CLAUDE.md,
 * section "Listes de lecture publiques".
 */
export default function ListDetailScreen({ route, navigation }: Props) {
  const { listId, listName, isDefault } = route.params;
  const dispatch = useAppDispatch();
  const entries = useAppSelector((state) => state.library.entries);
  const [sortMode, setSortMode] = useState<SortMode>('date');

  // Même mécanisme de rafraîchissement serveur que `LibraryScreen` (push
  // puis pull au focus, garde-fou anti-course) — nécessaire ICI AUSSI : on
  // peut revenir sur cet écran juste après avoir ajouté/aimé un livre
  // depuis `BookDetailScreen`, exactement le cas qui a motivé ce mécanisme
  // à l'origine sur `LibraryScreen`. Voir `useLibrarySync` pour le détail.
  useLibrarySync();

  const handleDelete = () => {
    Alert.alert(
      'Supprimer cette liste ?',
      `"${listName}" sera supprimée. Les livres qu'elle contient resteront dans ta bibliothèque.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            dispatch(deleteList(listId));
            navigation.goBack();
          },
        },
      ],
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: listName,
      headerRight: isDefault
        ? undefined
        : () => (
            <Pressable onPress={handleDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={colors.secondaryText} />
            </Pressable>
          ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, listName, isDefault]);

  const filtered = useMemo(() => {
    const inList = entries.filter((e) => e.listIds.includes(listId));
    return [...inList].sort((a, b) => {
      if (sortMode === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });
  }, [entries, listId, sortMode]);

  return (
    <View style={styles.container}>
      {/* "Scanner dans Recherche et listes" (08/10/2026) : le livre scanné s'ajoute directement à CETTE liste. */}
      <Pressable
        style={({ pressed }) => [styles.scanButton, pressed && styles.scanButtonPressed]}
        onPress={() => navigation.navigate('Scan', { listId, listName })}
      >
        <Ionicons name="barcode-outline" size={20} color={colors.background} />
        <Text style={styles.scanButtonText}>Scanner un livre</Text>
      </Pressable>

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
            caption={readingCaption(item, listId)}
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
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentOrange,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 2,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  scanButtonPressed: {
    opacity: 0.8,
  },
  scanButtonText: {
    color: colors.background,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sortButtonText: {
    ...typography.body,
    marginLeft: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  row: {
    justifyContent: 'space-between',
  },
  empty: {
    ...typography.body,
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
  },
});
