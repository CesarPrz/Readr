import React, { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import BookCard from '../components/BookCard';
import { bookRepository } from '../composition/repositories';
import type { Book } from '../domain/entities/Book';
import type { SearchStackParamList } from '../navigation/types';
import { clearResults, runSearch, setQuery } from '../store/searchSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { colors, radius, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<SearchStackParamList, 'SearchHome'>;

const DEBOUNCE_MS = 400;

export default function SearchScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { query, results, page, rawFetched, numFound, status } = useAppSelector((state) => state.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      dispatch(clearResults());
      return;
    }

    debounceRef.current = setTimeout(() => dispatch(runSearch({ query: trimmed, page: 1 })), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, dispatch]);

  const loadMore = useCallback(() => {
    if (status !== 'idle') return;
    // Compared against the raw (pre-grouping) count: grouping can shrink `results`
    // well below `numFound`, so comparing `results.length` here could loop forever.
    if (rawFetched >= numFound) return;
    dispatch(runSearch({ query: query.trim(), page: page + 1 }));
  }, [status, rawFetched, numFound, query, page, dispatch]);

  const openBook = useCallback(
    (book: Book) => {
      navigation.navigate('BookDetail', {
        workKey: book.id,
        presetWorkKeys: book.workKeys,
        presetTitle: book.title,
        presetAuthors: book.authors,
        presetCoverId: book.coverId,
        presetLanguages: book.languages,
      });
    },
    [navigation],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.hero}>Trouve ton{'\n'}prochain livre</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.secondaryText} />
        <TextInput
          value={query}
          onChangeText={(text) => dispatch(setQuery(text))}
          placeholder="Titre, auteur, ISBN..."
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {status === 'error' && (
        <Text style={styles.message}>La recherche a échoué. Vérifie ta connexion et réessaie.</Text>
      )}

      {status === 'loading' ? (
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
          ListEmptyComponent={
            query.trim().length > 0 ? null : (
              <Text style={styles.message}>Cherche un titre, un auteur ou un ISBN pour commencer.</Text>
            )
          }
          renderItem={({ item }) => (
            <BookCard
              title={item.title}
              authors={item.authors}
              coverUrl={bookRepository.coverUrl(item.coverId, 'M')}
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
  hero: {
    ...typography.hero,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.lg,
  },
  input: {
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.primaryText,
    fontSize: 15,
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
