import React, { useCallback, useEffect, useLayoutEffect } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ListPlaylistRow from '../components/ListPlaylistRow';
import ProfileHeader from '../components/ProfileHeader';
import { bookRepository } from '../composition/repositories';
import type { PublicProfileStackParamList } from '../navigation/types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { followUser, unfollowUser } from '../store/socialSlice';
import { loadPublicProfile } from '../store/usersSlice';
import { colors, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<PublicProfileStackParamList, 'UserProfile'>;

/**
 * Profil public d'un AUTRE utilisateur — "Recherche d'utilisateurs"
 * (08/10/2026, plan Firebase) : première utilisation réelle de
 * `ProfileHeader` en `editable={false}`, suivi de ses listes de lecture
 * (en lecture seule, chacune s'ouvre sur `UserListScreen`). Les paramètres de
 * navigation (`username`/`photoUrl`/`bio`, issus du résultat de recherche)
 * permettent d'afficher l'en-tête instantanément pendant que le profil
 * complet et les listes se chargent.
 */
export default function UserProfileScreen({ route, navigation }: Props) {
  const { uid, username, photoUrl, bio } = route.params;
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.users.profiles[uid]);
  const myUid = useAppSelector((s) => s.auth.user?.uid);
  const { followingIds, pendingUids } = useAppSelector((s) => s.social);
  const isFollowing = followingIds.includes(uid);

  const load = useCallback(() => {
    dispatch(loadPublicProfile(uid));
  }, [dispatch, uid]);

  useEffect(() => {
    load();
  }, [load]);

  const profile = state?.profile;
  const displayedName = profile?.username || username;

  useLayoutEffect(() => {
    navigation.setOptions({ title: displayedName });
  }, [navigation, displayedName]);

  const lists = state?.lists ?? [];
  const entries = state?.entries ?? [];
  const status = state?.status ?? 'loading';

  // Compteurs de CE lecteur, ajustés de façon optimiste selon que JE le suis déjà ou non (voir `usersSlice` : `followerIds` est la dernière lecture serveur).
  const followersCount = (state?.followerIds ?? []).filter((id) => id !== myUid).length + (isFollowing ? 1 : 0);
  const followingCount = (state?.followingIds ?? []).length;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={lists}
      keyExtractor={(list) => list.id}
      ListHeaderComponent={
        <>
          <ProfileHeader
            username={displayedName}
            photoUrl={profile ? profile.photoUrl : photoUrl}
            bio={profile ? profile.bio : bio}
            followersCount={followersCount}
            followingCount={followingCount}
            isAnonymous={false}
            editable={false}
            isFollowing={isFollowing}
            followPending={pendingUids.includes(uid)}
            onToggleFollow={myUid && myUid !== uid ? () => dispatch(isFollowing ? unfollowUser(uid) : followUser(uid)) : undefined}
          />
          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Listes</Text>
          {status === 'loading' && <ActivityIndicator style={styles.loader} color={colors.accentOrange} />}
          {status === 'error' && (
            <View>
              <Text style={styles.message}>Impossible de charger les listes. Vérifie ta connexion.</Text>
              <Pressable onPress={load} style={styles.retry}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          )}
          {status === 'ready' && lists.length === 0 && (
            <Text style={styles.message}>Aucune liste publique pour l'instant.</Text>
          )}
        </>
      }
      renderItem={({ item }) => {
        const inList = entries.filter((e) => e.listIds.includes(item.id));
        const mostRecent = [...inList].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())[0];
        const coverUrl = mostRecent ? mostRecent.coverUrl ?? bookRepository.coverUrl(mostRecent.coverId, 'S') : undefined;

        return (
          <ListPlaylistRow
            name={item.name}
            count={inList.length}
            listId={item.id}
            isDefault={item.isDefault}
            coverUrl={coverUrl}
            onPress={() => navigation.navigate('UserList', { uid, listId: item.id, listName: item.name })}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  separator: {
    height: 8,
    backgroundColor: colors.surface,
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  loader: {
    marginTop: spacing.md,
  },
  message: {
    ...typography.body,
    marginTop: spacing.sm,
  },
  retry: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  retryText: {
    color: colors.accentOrange,
    fontWeight: '600',
  },
});
