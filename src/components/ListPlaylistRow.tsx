import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_LIST_IDS } from '../domain/entities/ReadingList';
import { colors, radius, spacing, typography } from '../theme/theme';

type Props = {
  name: string;
  count: number;
  /** Id de la liste — utilisé pour choisir une icône/couleur par défaut (listes par défaut) ou dériver une couleur stable (listes perso). */
  listId: string;
  isDefault: boolean;
  /** Couverture du livre le plus récemment ajouté à cette liste, s'il y en a une — priorité sur l'icône de repli. */
  coverUrl?: string;
  onPress: () => void;
  onDelete?: () => void;
};

// Une icône + couleur sémantique par liste par défaut, dans l'esprit d'une
// vignette de playlist Spotify quand la liste n'a pas encore de livre pour
// en tirer une couverture. Les listes perso tombent sur une icône générique,
// avec une couleur choisie par un petit hash stable de leur id (voir
// `colorForCustomList`) plutôt qu'une seule couleur fixe pour toutes.
const DEFAULT_LIST_TILE: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  [DEFAULT_LIST_IDS.toRead]: { icon: 'bookmark', color: colors.accentOrange },
  [DEFAULT_LIST_IDS.reading]: { icon: 'book', color: colors.accentBlue },
  [DEFAULT_LIST_IDS.read]: { icon: 'checkmark-done', color: colors.accentSage },
  [DEFAULT_LIST_IDS.liked]: { icon: 'heart', color: colors.accentPink },
};

const CUSTOM_LIST_COLORS = [colors.accentOrange, colors.accentBlue, colors.accentSage, colors.accentPink];

function colorForCustomList(listId: string): string {
  let hash = 0;
  for (let i = 0; i < listId.length; i += 1) hash = (hash * 31 + listId.charCodeAt(i)) % CUSTOM_LIST_COLORS.length;
  return CUSTOM_LIST_COLORS[Math.abs(hash)];
}

export default function ListPlaylistRow({ name, count, listId, isDefault, coverUrl, onPress, onDelete }: Props) {
  const fallback = DEFAULT_LIST_TILE[listId] ?? { icon: 'list' as const, color: colorForCustomList(listId) };

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={styles.tile} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.tile, styles.tileFallback, { backgroundColor: fallback.color }]}>
          <Ionicons name={fallback.icon} size={26} color={colors.background} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.subtitle}>
          Playlist · {count} {count > 1 ? 'livres' : 'livre'}
        </Text>
      </View>

      {!isDefault && onDelete && (
        <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={18} color={colors.secondaryText} />
        </Pressable>
      )}

      <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
    </Pressable>
  );
}

const TILE_SIZE = 56;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  tileFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  name: {
    ...typography.title,
    fontSize: 16,
  },
  subtitle: {
    ...typography.body,
    marginTop: 2,
  },
  deleteButton: {
    marginRight: spacing.sm,
  },
});
