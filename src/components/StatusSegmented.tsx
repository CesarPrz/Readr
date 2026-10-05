import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DEFAULT_LIST_IDS } from '../domain/entities/ReadingList';
import { colors, radius, spacing } from '../theme/theme';

// Les 3 listes de statut restent affichées comme un segmented control fixe
// (comportement inchangé depuis avant les listes de lecture génériques),
// même si `value`/`onChange` manipulent désormais un id de liste générique
// plutôt qu'un `ReadingStatus` dédié — voir ReadingList.ts.
const OPTIONS: { value: string; label: string }[] = [
  { value: DEFAULT_LIST_IDS.toRead, label: 'À lire' },
  { value: DEFAULT_LIST_IDS.reading, label: 'En cours' },
  { value: DEFAULT_LIST_IDS.read, label: 'Lu' },
];

type Props = {
  value: string;
  onChange: (listId: string) => void;
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
