import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { FeedItem, FeedItemKind } from '../domain/entities/FeedItem';
import { colors, radius, spacing, typography } from '../theme/theme';
import { relativeTime } from '../utils/relativeTime';
import StarRatingDisplay from './StarRatingDisplay';

type Props = {
  item: FeedItem;
  /** URL de couverture déjà résolue (`coverUrl ?? bookRepository.coverUrl(...)`), par l'écran. */
  coverUrl?: string;
  onOpenBook: () => void;
  onOpenUser: () => void;
};

const ACTION_LABEL: Record<FeedItemKind, string> = {
  read: 'a lu',
  reading: 'a commencé à lire',
  rated: 'a noté',
};

const COVER_WIDTH = 68;
const AVATAR_SIZE = 22;

/**
 * Une ligne du fil d'amis, dans l'esprit d'une entrée du journal Letterboxd :
 * couverture à gauche ; à droite qui (avatar + pseudo) et ce qu'il a fait,
 * le titre, ses étoiles, sa note écrite s'il y en a une, et la date relative.
 */
export default function FeedItemRow({ item, coverUrl, onOpenBook, onOpenUser }: Props) {
  const { user, entry, kind, at } = item;

  return (
    <View style={styles.row}>
      <Pressable onPress={onOpenBook} style={({ pressed }) => pressed && styles.pressed}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.cover} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={styles.coverPlaceholderText} numberOfLines={4}>
              {entry.title}
            </Text>
          </View>
        )}
      </Pressable>

      <View style={styles.body}>
        <View style={styles.headerLine}>
          <Pressable onPress={onOpenUser} style={styles.userLine} hitSlop={6}>
            {user.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <Ionicons name="person-circle" size={AVATAR_SIZE} color={colors.secondaryText} />
            )}
            <Text style={styles.username} numberOfLines={1}>
              {user.username}
            </Text>
          </Pressable>
          <Text style={styles.action} numberOfLines={1}>
            {ACTION_LABEL[kind]}
          </Text>
        </View>

        <Pressable onPress={onOpenBook}>
          <Text style={styles.title} numberOfLines={2}>
            {entry.title}
          </Text>
          <Text style={styles.author} numberOfLines={1}>
            {entry.authors[0] ?? 'Auteur inconnu'}
          </Text>
        </Pressable>

        {entry.rating !== undefined && (
          <View style={styles.stars}>
            <StarRatingDisplay rating={entry.rating} />
          </View>
        )}

        {entry.note ? (
          <Text style={styles.note} numberOfLines={3}>
            {entry.note}
          </Text>
        ) : null}

        <Text style={styles.time}>{relativeTime(at)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  cover: {
    width: COVER_WIDTH,
    aspectRatio: 2 / 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  coverPlaceholderText: {
    ...typography.body,
    fontSize: 10,
    textAlign: 'center',
  },
  body: {
    flex: 1,
    marginLeft: spacing.md,
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: spacing.xs,
  },
  userLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: spacing.xs,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
  },
  username: {
    ...typography.title,
    fontSize: 14,
    marginLeft: spacing.xs,
    flexShrink: 1,
  },
  action: {
    ...typography.body,
    fontSize: 13,
  },
  title: {
    ...typography.title,
    fontSize: 16,
  },
  author: {
    ...typography.body,
    marginTop: 2,
  },
  stars: {
    marginTop: spacing.xs + 2,
  },
  note: {
    ...typography.body,
    fontStyle: 'italic',
    color: colors.primaryText,
    marginTop: spacing.xs + 2,
  },
  time: {
    ...typography.label,
    textTransform: 'none',
    fontWeight: '400',
    marginTop: spacing.xs + 2,
  },
});
