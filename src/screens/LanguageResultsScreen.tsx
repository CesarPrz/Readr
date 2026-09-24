import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import BookCard from '../components/BookCard';
import { bookRepository } from '../composition/repositories';
import type { Book } from '../domain/entities/Book';
import type { SearchStackParamList } from '../navigation/types';
import { runLanguageSearch } from '../store/languageResultsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { colors, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<SearchStackParamList, 'LanguageResults'>;

/**
 * Liste complète (paginée, comme la recherche principale) des livres d'une
 * langue donnée, ouverte depuis l'en-tête cliquable d'une row de
 * `SearchScreen`. Relance la même recherche que l'écran d'origine, filtrée
 * par langue côté serveur (`searchBooksInLanguage`) — pas limitée aux livres
 * déjà chargés dans la row.
 */
export default function LanguageResultsScreen({ route, navigation }: Props) {
  const { query, language } = route.params;
  const dispatch = useAppDispatch();
  const { results, page, rawFetched, numFound, status, query: currentQuery, language: currentLanguage } =
    useAppSelector((state) => state.languageResults);

  const isCurrent = currentQuery === query && currentLanguage === language;

  useEffect(() => {
    dispatch(runLanguageSearch({ query, language, page: 1 }));
  }, [query, language, dispatch]);

  const loadMore = useCallback(() => {
    if (!isCurrent || status !== 'idle') return;
    if (rawFetched >= numFound) return;
    dispatch(runLanguageSearch({ query, language, page: page + 1 }));
  }, [isCurrent, status, rawFetched, numFound, query, language, page, dispatch]);

  const openBook = useCallback(
    (book: Book) => {
      navigation.navigate('BookDetail', {
        workKey: book.id,
        presetWorkKeys: book.workKeys,
        presetTitle: book.title,
        presetAuthors: book.authors,
        presetCoverId: book.coverId,
        presetCoverUrl: book.coverUrl,
        presetLanguages: book.languages,
      });
    },
    [navigation],
  );

  const loading = !isCurrent || status === 'loading';

  return (
    <View style={styles.container}>
      {status === 'error' && isCurrent && (
        <Text style={styles.message}>La recherche a échoué. Vérifie ta connexion et réessaie.</Text>
      )}

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.accentOrange} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          renderItem={({ item }) => (
            <BookCard
              title={item.title}
              authors={item.authors}
              coverUrl={item.coverUrl ?? bookRepository.coverUrl(item.coverId, 'M')}
              onPress={() => openBook(item)}
            />
          )}
          ListFooterComponent={status === 'loadingMore' ? <ActivityIndicator color={colors.accentOrange} /> : null}
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
  },
  list: {
    paddingTop: spacing.lg,
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
