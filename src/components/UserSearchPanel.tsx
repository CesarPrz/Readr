import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UserSummary } from '../domain/repositories/UserSearchRepository';
import { MIN_USER_SEARCH_LENGTH } from '../domain/usecases/searchUsers';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearUserResults, searchUsers, setUserQuery } from '../store/usersSlice';
import { colors, radius, spacing, typography } from '../theme/theme';
import UserSearchRow from './UserSearchRow';

type Props = {
  onOpenUser: (user: UserSummary) => void;
};

const DEBOUNCE_MS = 350;

/**
 * Mode "Utilisateurs" de l'onglet Recherche ("Recherche d'utilisateurs",
 * 08/10/2026, plan Firebase) : barre de recherche par pseudo + liste de
 * résultats. État dans `usersSlice` (comme `searchSlice` pour les livres),
 * donc la saisie et les résultats survivent à un aller-retour vers un profil.
 */
export default function UserSearchPanel({ onOpenUser }: Props) {
  const dispatch = useAppDispatch();
  const { query, results, searchStatus, searchError } = useAppSelector((state) => state.users);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trimmed = query.trim();
  const tooShort = trimmed.length < MIN_USER_SEARCH_LENGTH;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (tooShort) {
      dispatch(clearUserResults());
      return;
    }

    debounceRef.current = setTimeout(() => dispatch(searchUsers(trimmed)), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmed, tooShort, dispatch]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="person" size={18} color={colors.secondaryText} />
        <TextInput
          value={query}
          onChangeText={(text) => dispatch(setUserQuery(text))}
          placeholder="Pseudo d'un lecteur..."
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {searchStatus === 'error' && (
        <Text style={styles.message}>
          La recherche a échoué. Vérifie ta connexion et réessaie.
          {searchError ? `\n(${searchError})` : ''}
        </Text>
      )}

      {searchStatus === 'loading' ? (
        <ActivityIndicator style={styles.loader} color={colors.accentOrange} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(user) => user.uid}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            tooShort ? (
              <Text style={styles.message}>Tape au moins {MIN_USER_SEARCH_LENGTH} lettres du pseudo d'un lecteur.</Text>
            ) : searchStatus === 'idle' ? (
              <Text style={styles.message}>Aucun lecteur trouvé pour « {trimmed} ».</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <UserSearchRow
              username={item.username}
              photoUrl={item.photoUrl}
              bio={item.bio}
              onPress={() => onOpenUser(item)}
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
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
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
  loader: {
    marginTop: spacing.xl,
  },
  message: {
    ...typography.body,
    marginTop: spacing.md,
  },
});
