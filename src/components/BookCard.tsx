import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius, spacing, typography } from '../theme/theme';

type Props = {
  title: string;
  authors: string[];
  coverUrl?: string;
  onPress: () => void;
};

export default function BookCard({ title, authors, coverUrl, onPress }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
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
