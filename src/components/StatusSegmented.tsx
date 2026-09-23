import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReadingStatus } from '../domain/entities/LibraryEntry';
import { colors, radius, spacing } from '../theme/theme';

const OPTIONS: { value: ReadingStatus; label: string }[] = [
  { value: 'to_read', label: 'À lire' },
  { value: 'reading', label: 'En cours' },
  { value: 'read', label: 'Lu' },
];

type Props = {
  value: ReadingStatus;
  onChange: (status: ReadingStatus) => void;
};

export default function StatusSegmented({ value, onChange }: Props) {
  return (
    <View style={styles.track}>
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.accentOrange,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  labelActive: {
    color: colors.background,
  },
});
