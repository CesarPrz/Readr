import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import FeedItemRow from '../components/FeedItemRow';
import { bookRepository } from '../composition/repositories';
import type { FeedStackParamList, RootTabParamList } from '../navigation/types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadFeed } from '../store/feedSlice';
import { loadFollowGraph } from '../store/socialSlice';
import { colors, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<FeedStackParamList, 'FeedHome'>;

/**
 * "Fil d'amis" (08/10/2026, plan Firebase) : l'activité de lecture des
 * lecteurs que JE suis, à la Letterboxd — qui a lu, commencé ou noté quoi,
 * avec ses étoiles et sa note écrite. Rechargé à chaque focus de l'onglet
 * (même principe que l'écran Bibliothèque : le serveur fait foi, rien en
 * temps réel). Voir `getFriendFeed` pour ce qui entre dans le fil.
 */
export default function FeedScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { items, status } = useAppSelector((state) => state.feed);
  const followingCount = useAppSelector((state) => state.social.followingIds.length);

  useFocusEffect(
    useCallback(() => {
      dispatch(loadFollowGraph());
      dispatch(loadFeed());
    }, [dispatch]),
  );

  const goToUserSearch = () => {
    navigation.getParent<BottomTabNavigationProp<RootTabParamList>>()?.navigate('Recherche');
  };

  const emptyMessage =
    followingCount === 0
      ? 'Suis des lecteurs pour voir ici ce qu’ils lisent, ce qu’ils ont aimé et leurs notes.'
      : 'Rien de neuf pour l’instant : les lecteurs que tu suis n’ont encore rien lu, commencé ni noté.';

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={status === 'refreshing'}
        onRefresh={() => dispatch(loadFeed())}
        ListHeaderComponent={<Text style={styles.hero}>Ce que lisent{'\n'}tes amis</Text>}
        ListEmptyComponent={
          status === 'loading' ? (
            <ActivityIndicator style={styles.loader} color={colors.accentOrange} />
          ) : status === 'error' ? (
            <View>
              <Text style={styles.message}>Impossible de charger le fil. Vérifie ta connexion.</Text>
              <Pressable onPress={() => dispatch(loadFeed())} style={styles.action}>
                <Text style={styles.actionText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Text style={styles.message}>{emptyMessage}</Text>
              {followingCount === 0 && (
                <Pressable onPress={goToUserSearch} style={styles.action}>
                  <Text style={styles.actionText}>Chercher des lecteurs</Text>
                </Pressable>
              )}
            </View>
          )
        }
        renderItem={({ item }) => (
          <FeedItemRow
            item={item}
            coverUrl={item.entry.coverUrl ?? bookRepository.coverUrl(item.entry.coverId, 'M')}
            onOpenBook={() =>
              navigation.navigate('BookDetail', {
                workKey: item.entry.id,
                presetWorkKeys: item.entry.workKeys,
                presetTitle: item.entry.title,
                presetAuthors: item.entry.authors,
                presetCoverId: item.entry.coverId,
                presetCoverUrl: item.entry.coverUrl,
                presetDescription: item.entry.description,
                presetLanguages: item.entry.languages,
              })
            }
            onOpenUser={() =>
              navigation.navigate('UserProfile', {
                uid: item.user.uid,
                username: item.user.username,
                photoUrl: item.user.photoUrl,
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
    paddingHorizontal: spacing.lg,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  hero: {
    ...typography.hero,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  loader: {
    marginTop: spacing.xl,
  },
  message: {
    ...typography.body,
    marginTop: spacing.md,
  },
  action: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  actionText: {
    color: colors.accentOrange,
    fontWeight: '600',
  },
});
