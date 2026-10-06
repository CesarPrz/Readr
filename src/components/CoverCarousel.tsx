import React, { useCallback, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius, spacing } from '../theme/theme';

const COVER_WIDTH = 180;
const COVER_ASPECT_RATIO = 2 / 3;
const COVER_HEIGHT = COVER_WIDTH / COVER_ASPECT_RATIO;

type Props = {
  /** URLs déjà résolues (voir `BookRepository.coverUrl`) — purement présentationnel, pas de coverId ici. */
  coverUrls: string[];
};

/**
 * Certains livres ont plusieurs couvertures référencées — une par édition
 * fusionnée (voir `Edition.coverId` et `pickCoverId` côté mapping) — et la
 * couverture "par défaut" choisie automatiquement ne correspond pas toujours
 * à l'édition que possède l'utilisateur. Ce carrousel laisse swiper entre
 * toutes les couvertures connues plutôt que d'en imposer une seule.
 *
 * Une seule couverture (le cas courant) → image statique, pas de machinerie
 * de swipe ni de points inutiles.
 */
export default function CoverCarousel({ coverUrls }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / COVER_WIDTH);
    setActiveIndex(index);
  }, []);

  if (coverUrls.length <= 1) {
    return <Image source={{ uri: coverUrls[0] }} style={styles.cover} contentFit="cover" transition={150} />;
  }

  return (
    <View>
      {/* `frame` a une taille fixe et `overflow: hidden` : la FlatList est posée en
          position absolue dedans (`StyleSheet.absoluteFill`), donc elle ne
          peut physiquement pas dépasser cette taille — même si son propre calcul de
          hauteur de contenu se trompe (ce qui arrivait avant : un simple `height`
          sur le style de la FlatList ne suffisait pas à empêcher un grand espace
          vide de s'ouvrir entre la couverture et les points). */}
      <View style={styles.frame}>
        <FlatList
          data={coverUrls}
          keyExtractor={(uri, index) => `${uri}-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.list}
          onScroll={onScroll}
          scrollEventThrottle={32}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.cover} contentFit="cover" transition={150} />
          )}
        />
      </View>
      <View style={styles.dots}>
        {coverUrls.map((uri, index) => (
          <View key={uri} style={[styles.dot, index === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  list: {
    ...StyleSheet.absoluteFill,
  },
  cover: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    aspectRatio: COVER_ASPECT_RATIO,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.accentOrange,
  },
});
