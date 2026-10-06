import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';

type Props = {
  /** Note entière de 1 à 5 (voir `LibraryEntry.rating`). */
  rating: number;
  size?: number;
};

/** Étoiles en LECTURE SEULE (fil d'amis) — la saisie de sa propre note reste `RatingStars`, sur la fiche livre. */
export default function StarRatingDisplay({ rating, size = 14 }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={size}
          color={star <= rating ? colors.accentOrange : colors.placeholder}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 2,
  },
});
