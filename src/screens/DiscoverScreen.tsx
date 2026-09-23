import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import BookCard from '../components/BookCard';
import { bookRepository } from '../composition/repositories';
import type { Book } from '../domain/entities/Book';
import type { DiscoverStackParamList } from '../navigation/types';
import { fetchRecommendations } from '../store/discoverSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { colors, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'DiscoverHome'>;

export default function DiscoverScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { recommendations, status } = useAppSelector((state) => state.discover);
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
        presetTitle: book.title,
        presetAuthors: book.authors,
        presetCoverId: book.coverId,
      });
    },
    [navigation],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.hero}>Découvrir</Text>
      <Text style={styles.subtitle}>Basé sur les livres lus et ajoutés à ta bibliothèque</Text>

      {status === 'loading' && recommendations.length === 0 ? (
        <ActivityIndicator style={styles.loader} color={colors.accentOrange} />
      ) : (
        <FlatList
          data={recommendations}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.message}>
              {libraryCount === 0
                ? 'Ajoute des livres à ta bibliothèque pour recevoir des recommandations.'
                : "Pas de recommandation pour l'instant — réessaie plus tard."}
            </Text>
          }
          renderItem={({ item }) => (
            <BookCard
              title={item.title}
              authors={item.authors}
              coverUrl={bookRepository.coverUrl(item.coverId, 'M')}
              onPress={() => openBook(item)}
            />
          )}
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
  row: {
    justifyContent: 'space-between',
  },
  loader: {
    marginTop: spacing.xl,
  },
  message: {
    ...typography.body,
    marginTop: spacing.lg,
  },
});
