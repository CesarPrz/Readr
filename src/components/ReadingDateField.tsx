import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { colors, radius, spacing, typography } from '../theme/theme';
import { formatReadingDay, readingDayToDate, toReadingDay } from '../utils/readingDates';

type Props = {
  label: string;
  /** Jour `YYYY-MM-DD`, ou `undefined` quand la date n'est pas renseignée. */
  value?: string;
  /** Appelé avec le jour choisi, ou `undefined` quand on efface la date. */
  onChange: (value: string | undefined) => void;
  /** Dernier jour sélectionnable (`YYYY-MM-DD`) — aujourd'hui par défaut : on ne lit pas dans le futur. */
  maximumDay?: string;
};

/**
 * Une ligne « libellé — date » qui ouvre le sélecteur de dates NATIF
 * (`@react-native-community/datetimepicker`, "Dates de lecture", 08/10/2026) :
 * boîte de dialogue du système sur Android (API impérative), calendrier
 * intégré sous la ligne sur iOS (avec un bouton « OK » pour le replier). La
 * croix efface la date. Composant volontairement bête : il ne connaît ni
 * livre ni Redux, la cohérence début/fin est gérée par l'écran et le usecase.
 */
export default function ReadingDateField({ label, value, onChange, maximumDay }: Props) {
  const [iosOpen, setIosOpen] = useState(false);
  const maximumDate = readingDayToDate(maximumDay ?? toReadingDay());
  const current = value ? readingDayToDate(value) : maximumDate;

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        maximumDate,
        onChange: (event, date) => {
          // 'dismissed' = l'utilisateur a fermé la boîte sans valider : rien ne change.
          if (event.type === 'set' && date) onChange(toReadingDay(date));
        },
      });
    } else {
      setIosOpen((wasOpen) => !wasOpen);
    }
  };

  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueArea}>
          <Pressable onPress={open} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${label} : modifier`}>
            <Text style={[styles.value, !value && styles.placeholder]}>
              {value ? formatReadingDay(value) : 'Choisir une date'}
            </Text>
          </Pressable>
          {value ? (
            <Pressable
              onPress={() => {
                setIosOpen(false);
                onChange(undefined);
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`${label} : effacer`}
              style={styles.clear}
            >
              <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {Platform.OS === 'ios' && iosOpen ? (
        <View style={styles.iosPicker}>
          <DateTimePicker
            value={current}
            mode="date"
            display="inline"
            themeVariant="dark"
            locale="fr-FR"
            maximumDate={maximumDate}
            onChange={(_event, date) => {
              if (date) onChange(toReadingDay(date));
            }}
          />
          <Pressable onPress={() => setIosOpen(false)} style={styles.iosDone}>
            <Text style={styles.iosDoneText}>OK</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.body,
  },
  valueArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: '600',
  },
  placeholder: {
    color: colors.accentOrange,
    fontWeight: '600',
  },
  clear: {
    marginLeft: spacing.sm,
  },
  iosPicker: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  iosDone: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  iosDoneText: {
    color: colors.accentOrange,
    fontWeight: '700',
  },
});
