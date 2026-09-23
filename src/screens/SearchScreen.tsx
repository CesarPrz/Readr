import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import BookCard from '../components/BookCard';
import { docToSummary, searchBooks } from '../api/openLibrary';
import type { OpenLibraryDoc } from '../api/types';
import type { SearchStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<SearchStackParamList, 'SearchHome'>;

const DEBOUNCE_MS = 400;

export default function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OpenLibraryDoc[]>([]);
  const [page, setPage] = useState(1);
  const [numFound, setNumFound] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'loadingMore' | 'error'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const runSearch = useCallback(async (q: string, nextPage: number) => {
    const requestId = ++requestIdRef.current;
    setStatus(nextPage === 1 ? 'loading' : 'loadingMore');
    try {
      const result = await searchBooks(q, nextPage);
      if (requestId !== requestIdRef.current) return; // a newer search superseded this one
      setResults((prev) => (nextPage === 1 ? result.docs : [...prev, ...result.docs]));
      setNumFound(result.numFound);
      setPage(nextPage);
      setStatus('idle');
    } catch {
      if (requestId !== requestIdRef.current) return;
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      requestIdRef.current += 1; // cancel any in-flight search
      setResults([]);
      setNumFound(0);
      setStatus('idle');
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(trimmed, 1), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const loadMore = useCallback(() => {
    if (status !== 'idle') return;
    if (results.length >= numFound) return;
    runSearch(query.trim(), page + 1);
  }, [status, results.length, numFound, query, page, runSearch]);

  const openBook = useCallback(
    (doc: OpenLibraryDoc) => {
      navigation.navigate('BookDetail', {
        workKey: doc.key,
        presetTitle: doc.title,
        presetAuthors: doc.author_name ?? [],
        presetCoverId: doc.cover_i,
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
          onChangeText={setQuery}
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
          keyExtractor={(item) => item.key}
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
          renderItem={({ item }) => {
            const summary = docToSummary(item);
            return (
              <BookCard
                title={summary.title}
                authors={summary.authors}
                coverId={summary.coverId}
                onPress={() => openBook(item)}
              />
            );
          }}
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
