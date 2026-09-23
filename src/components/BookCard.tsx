import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { coverUrl } from '../api/openLibrary';
import { colors, radius, spacing, typography } from '../theme/theme';

type Props = {
  title: string;
  authors: string[];
  coverId?: number;
  onPress: () => void;
};

export default function BookCard({ title, authors, coverId, onPress }: Props) {
  const uri = coverUrl(coverId, 'M');

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.coverWrap}>
        {uri ? (
          <Image source={{ uri }} style={styles.cover} contentFit="cover" transition={150} />
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
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
});
