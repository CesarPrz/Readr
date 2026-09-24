import React, { useCallback, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius, spacing } from '../theme/theme';

const COVER_WIDTH = 180;
const COVER_ASPECT_RATIO = 2 / 3;

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
      <View style={styles.dots}>
        {coverUrls.map((uri, index) => (
          <View key={uri} style={[styles.dot, index === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    width: COVER_WIDTH,
  },
  cover: {
    width: COVER_WIDTH,
    aspectRatio: COVER_ASPECT_RATIO,
    borderRadius: radius.lg,
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
