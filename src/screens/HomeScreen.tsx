import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FeedItemRow from '../components/FeedItemRow';
import RecommendationRow from '../components/RecommendationRow';
import { bookRepository } from '../composition/repositories';
import type { Book } from '../domain/entities/Book';
import type { FeedItem } from '../domain/entities/FeedItem';
import type { HomeStackParamList, RootTabParamList } from '../navigation/types';
import { fetchRecommendations } from '../store/discoverSlice';
import { loadFeed } from '../store/feedSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadFollowGraph } from '../store/socialSlice';
import { colors, radius, spacing, typography } from '../theme/theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;

/** Nombre de lignes du fil montrées avant "Voir plus" : l'accueil reste un aperçu, les recommandations restent atteignables. */
const FEED_PREVIEW_COUNT = 8;
/** Nombre de rangées de recommandations montrées sur l'accueil ; le reste est dans l'onglet Découvrir. */
const HOME_RECOMMENDATION_GROUPS = 3;

/**
 * Accueil "façon Goodreads" (08/10/2026, remplace l'ancien onglet Fil) :
 * une barre de recherche fixe en haut (elle ouvre l'onglet Recherche, avec
 * un raccourci vers le scan de code-barres), puis sur le reste de l'écran le
 * fil des lecteurs suivis (voir `getFriendFeed`) et, dessous, les
 * recommandations "Pour toi" (voir `getRecommendations`).
 *
 * Même principe qu'avant pour le fil : rechargé à chaque focus, le serveur
 * fait foi, rien en temps réel. La barre de recherche est rendue hors de la
 * FlatList : elle reste visible pendant que le contenu défile.
 */
export default function HomeScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { items, status } = useAppSelector((state) => state.feed);
  const { groups, status: discoverStatus } = useAppSelector((state) => state.discover);
  const followingCount = useAppSelector((state) => state.social.followingIds.length);
  const libraryCount = useAppSelector((state) => state.library.entries.length);
  const [showAllFeed, setShowAllFeed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      dispatch(loadFollowGraph());
      dispatch(loadFeed());
    }, [dispatch]),
  );

  useEffect(() => {
    // Même déclencheurs que l'onglet Découvrir : taille de la bibliothèque et nombre d'abonnements.
    dispatch(fetchRecommendations());
  }, [dispatch, libraryCount, followingCount]);

  const tabs = () => navigation.getParent<BottomTabNavigationProp<RootTabParamList>>();

  const openSearch = () => {
    tabs()?.navigate('Recherche', { screen: 'SearchHome', params: { focusToken: Date.now() } });
  };

  const openScan = () => {
    // `initial: false` : la pile Recherche garde SearchHome en dessous, "retour" depuis le scan y ramène.
    tabs()?.navigate('Recherche', { screen: 'Scan', initial: false });
  };

  const openUserSearch = () => {
    tabs()?.navigate('Recherche', { screen: 'SearchHome', params: { mode: 'users', focusToken: Date.now() } });
  };

  const openDiscover = () => {
    tabs()?.navigate('Découvrir', { screen: 'DiscoverHome' });
  };

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

  const refresh = () => {
    dispatch(loadFollowGraph());
    dispatch(loadFeed());
    dispatch(fetchRecommendations());
  };

  const visibleItems = showAllFeed ? items : items.slice(0, FEED_PREVIEW_COUNT);
  const hiddenCount = items.length - visibleItems.length;
  const homeGroups = groups.slice(0, HOME_RECOMMENDATION_GROUPS);

  const emptyMessage =
    followingCount === 0
      ? 'Suis des lecteurs pour voir ici ce qu’ils lisent, ce qu’ils ont aimé et leurs notes.'
      : 'Rien de neuf pour l’instant : les lecteurs que tu suis n’ont encore rien lu, commencé ni noté.';

  const renderFeedItem = ({ item }: { item: FeedItem }) => (
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
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      {/* Barre de recherche : un faux champ, le vrai vit dans l'onglet Recherche. */}
      <View style={styles.searchBar}>
        <Pressable
          onPress={openSearch}
          style={styles.searchField}
          accessibilityRole="search"
          accessibilityLabel="Rechercher un livre"
        >
          <Ionicons name="search" size={18} color={colors.secondaryText} />
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            Titre, auteur ou ISBN
          </Text>
        </Pressable>
        <Pressable onPress={openScan} hitSlop={10} style={styles.scanButton} accessibilityLabel="Scanner un code-barres">
          <Ionicons name="barcode-outline" size={24} color={colors.primaryText} />
        </Pressable>
      </View>

      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={status === 'refreshing'}
        onRefresh={refresh}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Mises à jour de tes abonnements</Text>}
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
            <EmptyFeed message={emptyMessage} showFindReaders={followingCount === 0} onFindReaders={openUserSearch} />
          )
        }
        renderItem={renderFeedItem}
        ListFooterComponent={
          <View>
            {hiddenCount > 0 && (
              <Pressable onPress={() => setShowAllFeed(true)} style={styles.action}>
                <Text style={styles.actionText}>Voir plus ({hiddenCount})</Text>
              </Pressable>
            )}

            <Text style={[styles.sectionTitle, styles.forYouTitle]}>Pour toi</Text>
            {discoverStatus === 'loading' && homeGroups.length === 0 ? (
              <ActivityIndicator style={styles.loader} color={colors.accentOrange} />
            ) : homeGroups.length === 0 ? (
              <Text style={styles.message}>
                Ajoute des livres à ta bibliothèque pour recevoir des recommandations.
              </Text>
            ) : (
              homeGroups.map((group) => <RecommendationRow key={group.id} group={group} onOpenBook={openBook} />)
            )}
            {groups.length > 0 && (
              <Pressable onPress={openDiscover} style={styles.action}>
                <Text style={styles.actionText}>Toutes les recommandations</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </View>
  );
}

function EmptyFeed({
  message,
  showFindReaders,
  onFindReaders,
}: {
  message: string;
  showFindReaders: boolean;
  onFindReaders: () => void;
}) {
  return (
    <View>
      <Text style={styles.message}>{message}</Text>
      {showFindReaders && (
        <Pressable onPress={onFindReaders} style={styles.action}>
          <Text style={styles.actionText}>Trouver des lecteurs</Text>
        </Pressable>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  searchPlaceholder: {
    flex: 1,
    color: colors.placeholder,
    fontSize: 15,
  },
  scanButton: {
    padding: spacing.xs,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.title,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  forYouTitle: {
    marginTop: spacing.lg,
  },
  loader: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  message: {
    ...typography.body,
    marginTop: spacing.sm,
  },
  action: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionText: {
    color: colors.accentOrange,
    fontWeight: '600',
  },
});
