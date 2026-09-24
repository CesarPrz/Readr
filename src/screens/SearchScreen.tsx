import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import BookCard from '../components/BookCard';
import { bookRepository } from '../composition/repositories';
import type { Book } from '../domain/entities/Book';
import type { SearchStackParamList } from '../navigation/types';
import { clearResults, runSearch, setQuery } from '../store/searchSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { colors, radius, spacing, typography } from '../theme/theme';
import { languageLabel } from '../utils/languageLabels';

type Props = NativeStackScreenProps<SearchStackParamList, 'SearchHome'>;

const DEBOUNCE_MS = 400;
const ROW_CARD_WIDTH = 120;

type LanguageGroup = {
  language: string; // '' pour les livres sans langue connue
  label: string;
  books: Book[];
};

/**
 * Regroupe les résultats par langue principale (la première de `Book.languages`)
 * pour l'affichage en rows, dans l'ordre de première apparition — un ordre par
 * nombre de livres réordonnerait les rows existantes à chaque page chargée,
 * ce qui serait plus perturbant qu'utile pour une simple présentation.
 */
function groupByLanguage(books: Book[]): LanguageGroup[] {
  const order: string[] = [];
  const byLanguage = new Map<string, Book[]>();

  for (const book of books) {
    const language = book.languages[0] ?? '';
    if (!byLanguage.has(language)) {
      byLanguage.set(language, []);
      order.push(language);
    }
    byLanguage.get(language)!.push(book);
  }

  return order.map((language) => ({
    language,
    label: language ? languageLabel(language) : 'Langue inconnue',
    books: byLanguage.get(language)!,
  }));
}

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
        presetCoverUrl: book.coverUrl,
        presetLanguages: book.languages,
      });
    },
    [navigation],
  );

  const openLanguage = useCallback(
    (language: string) => {
      navigation.navigate('LanguageResults', { query: query.trim(), language });
    },
    [navigation, query],
  );

  const languageGroups = useMemo(() => groupByLanguage(results), [results]);

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
          data={languageGroups}
          keyExtractor={(group) => group.language || '__unknown__'}
          contentContainerStyle={styles.list}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          ListEmptyComponent={
            query.trim().length > 0 ? null : (
              <Text style={styles.message}>Cherche un titre, un auteur ou un ISBN pour commencer.</Text>
            )
          }
          renderItem={({ item: group }) => (
            <View style={styles.section}>
              {group.language ? (
                <Pressable
                  style={({ pressed }) => [styles.sectionHeader, pressed && styles.sectionHeaderPressed]}
                  onPress={() => openLanguage(group.language)}
                >
                  <Text style={styles.sectionTitle}>{group.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
                </Pressable>
              ) : (
                <Text style={[styles.sectionTitle, styles.sectionTitleStandalone]}>{group.label}</Text>
              )}

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
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionHeaderPressed: {
    opacity: 0.6,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 16,
  },
  sectionTitleStandalone: {
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
