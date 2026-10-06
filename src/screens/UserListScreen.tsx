import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import BookCard from '../components/BookCard';
import { bookRepository } from '../composition/repositories';
import type { PublicProfileStackParamList } from '../navigation/types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadPublicProfile } from '../store/usersSlice';
import { colors, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<PublicProfileStackParamList, 'UserList'>;

/**
 * Contenu d'une liste de lecture d'un AUTRE utilisateur, en lecture seule
 * — "Recherche d'utilisateurs" (08/10/2026, plan Firebase). Pendant public
 * de `ListDetailScreen` : mêmes cartes, mais lues depuis le cache de profil
 * public de `usersSlice` (jamais depuis `library`, qui est SA propre
 * bibliothèque) et sans tri, suppression ni rafraîchissement du serveur qui
 * fait foi. Un tap sur un livre ouvre la fiche normale, d'où on peut
 * l'ajouter à sa propre bibliothèque.
 */
export default function UserListScreen({ route, navigation }: Props) {
  const { uid, listId } = route.params;
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.users.profiles[uid]);

  // Normalement déjà chargé par `UserProfileScreen` ; ce chargement ne sert
  // que si on arrive ici sans être passé par lui.
  useEffect(() => {
    if (!state) dispatch(loadPublicProfile(uid));
  }, [state, dispatch, uid]);

  const books = useMemo(() => {
    const inList = (state?.entries ?? []).filter((e) => e.listIds.includes(listId));
    return [...inList].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  }, [state?.entries, listId]);

  if (!state || state.status === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={styles.loader} color={colors.accentOrange} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {state.status === 'error' ? 'Impossible de charger cette liste.' : "Rien ici pour l'instant."}
          </Text>
        }
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
  },
  loader: {
    marginTop: spacing.xl,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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
