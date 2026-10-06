import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius, spacing, typography } from '../theme/theme';

type Props = {
  title: string;
  authors: string[];
  /** Un ou deux tags de genre (voir `Book.genres`) — rien n'est affiché si absent ou vide. */
  genres?: string[];
  coverUrl?: string;
  onPress: () => void;
  /** '48%' (grille deux colonnes) par défaut ; une largeur fixe en pixels pour une row horizontale. */
  width?: number | `${number}%`;
};

export default function BookCard({ title, authors, genres, coverUrl, onPress, width = '48%' }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.coverWrap}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.cover} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={styles.coverPlaceholderText} numberOfLines={4}>
              {title}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.author} numberOfLines={1}>
        {authors[0] ?? 'Auteur inconnu'}
      </Text>
      {genres && genres.length > 0 && (
        <View style={styles.tags}>
          {genres.slice(0, 2).map((genre) => (
            <View key={genre} style={styles.tag}>
              <Text style={styles.tagText} numberOfLines={1}>
                {genre}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  pressed: {
    opacity: 0.7,
  },
  coverWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  cover: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  coverPlaceholderText: {
    ...typography.body,
    textAlign: 'center',
  },
  title: {
    ...typography.title,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  author: {
    ...typography.body,
    marginTop: 2,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs + 2,
  },
  tag: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    maxWidth: '100%',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accentOrange,
  },
});
