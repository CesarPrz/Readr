import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import BookCard from '../components/BookCard';
import { bookRepository } from '../composition/repositories';
import type { Book } from '../domain/entities/Book';
import type { RecommendationGroup } from '../domain/entities/RecommendationGroup';
import type { DiscoverStackParamList } from '../navigation/types';
import { fetchRecommendations } from '../store/discoverSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { colors, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'DiscoverHome'>;

const ROW_CARD_WIDTH = 120;

export default function DiscoverScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { groups, status } = useAppSelector((state) => state.discover);
  const libraryCount = useAppSelector((state) => state.library.entries.length);

  useEffect(() => {
    // Recomputed whenever the library's size changes, so a book you just
    // added or removed immediately influences what's suggested next.
    dispatch(fetchRecommendations());
  }, [dispatch, libraryCount]);

  const openBook = useCallback(
    (book: Book) => {
      navigation.navigate('BookDetail', {
        workKey: book.id,
        presetWorkKeys: book.workKeys,
        presetTitle: book.title,
        presetAuthors: book.authors,
        presetCoverId: book.coverId,
        presetCoverUrl: book.coverUrl,
        presetDescription: book.description,
        presetLanguages: book.languages,
      });
    },
    [navigation],
  );

  const renderGroup = useCallback(
    ({ item: group }: { item: RecommendationGroup }) => (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{group.title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
          {group.books.map((book) => (
            <BookCard
              key={book.id}
              title={book.title}
              authors={book.authors}
              coverUrl={book.coverUrl ?? bookRepository.coverUrl(book.coverId, 'M')}
              onPress={() => openBook(book)}
              width={ROW_CARD_WIDTH}
            />
          ))}
        </ScrollView>
      </View>
    ),
    [openBook],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.hero}>Découvrir</Text>
      <Text style={styles.subtitle}>Basé sur ce que tu as lu et aimé dans ta bibliothèque</Text>

      {status === 'loading' && groups.length === 0 ? (
        <ActivityIndicator style={styles.loader} color={colors.accentOrange} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(group) => group.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.message}>
              {libraryCount === 0
                ? 'Ajoute des livres à ta bibliothèque pour recevoir des recommandations.'
                : "Pas de recommandation pour l'instant — marque un livre comme lu ou aimé pour en obtenir."}
            </Text>
          }
          renderItem={renderGroup}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  hero: {
    ...typography.hero,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  rowContent: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  loader: {
    marginTop: spacing.xl,
  },
  message: {
    ...typography.body,
    marginTop: spacing.lg,
  },
});
