import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/theme';

type Props = {
  rating?: number;
  onChange: (rating: number) => void;
  size?: number;
};

export default function RatingStars({ rating = 0, onChange, size = 24 }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Pressable key={value} onPress={() => onChange(value)} hitSlop={6}>
          <Ionicons
            name={value <= rating ? 'star' : 'star-outline'}
            size={size}
            color={value <= rating ? colors.accentOrange : colors.secondaryText}
            style={styles.star}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  star: {
    marginRight: spacing.xs,
  },
});
