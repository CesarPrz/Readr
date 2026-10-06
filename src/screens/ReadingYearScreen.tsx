import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import BookCard from '../components/BookCard';
import { bookRepository } from '../composition/repositories';
import type { LibraryEntry } from '../domain/entities/LibraryEntry';
import { DEFAULT_LIST_IDS } from '../domain/entities/ReadingList';
import { buildReadingYear, readingYears, type TimedRead } from '../domain/usecases/buildReadingYear';
import { useLibrarySync } from '../hooks/useLibrarySync';
import type { LibraryStackParamList } from '../navigation/types';
import { useAppSelector } from '../store/hooks';
import { colors, radius, spacing, typography } from '../theme/theme';
import { describeReadingPeriod } from '../utils/readingDates';

type Props = NativeStackScreenProps<LibraryStackParamList, 'ReadingYear'>;

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

const BAR_MAX_HEIGHT = 96;
const ROW_CARD_WIDTH = 110;

const plural = (n: number, singular: string, pluralForm: string) => `${n} ${n > 1 ? pluralForm : singular}`;

/**
 * "Mon année de lecture" (06/10/2026) : le bilan d'une année, calculé à la
 * volée par `buildReadingYear` à partir des livres « Lu » et de leur date de
 * fin ("Dates de lecture"). Nombre de livres, note et durée moyennes,
 * histogramme par mois, lecture la plus rapide / la plus longue, puis les
 * livres mois par mois (le plus récent en haut). Les flèches passent d'une
 * année à l'autre parmi celles qui ont au moins un livre terminé.
 */
export default function ReadingYearScreen({ route, navigation }: Props) {
  const entries = useAppSelector((state) => state.library.entries);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(route.params?.year ?? currentYear);

  // Même rafraîchissement serveur au focus que les autres écrans de la bibliothèque (retour depuis une fiche livre où l'on vient de corriger une date).
  useLibrarySync();

  const years = useMemo(() => readingYears(entries, currentYear), [entries, currentYear]);
  const summary = useMemo(() => buildReadingYear(entries, year), [entries, year]);
  const yearIndex = years.indexOf(year);
  const olderYear = yearIndex >= 0 ? years[yearIndex + 1] : years.find((y) => y < year);
  const newerYear = yearIndex > 0 ? years[yearIndex - 1] : undefined;

  const maxPerMonth = Math.max(1, ...summary.months.map((m) => m.books.length));
  const monthsWithBooks = summary.months.filter((m) => m.books.length > 0).reverse();
  const likedCount = summary.books.filter((b) => b.listIds.includes(DEFAULT_LIST_IDS.liked)).length;

  const openBook = (entry: LibraryEntry) =>
    navigation.navigate('BookDetail', {
      workKey: entry.id,
      presetWorkKeys: entry.workKeys,
      presetTitle: entry.title,
      presetAuthors: entry.authors,
      presetCoverId: entry.coverId,
      presetCoverUrl: entry.coverUrl,
      presetDescription: entry.description,
      presetLanguages: entry.languages,
    });

  const coverOf = (entry: LibraryEntry, size: 'S' | 'M') => entry.coverUrl ?? bookRepository.coverUrl(entry.coverId, size);

  const renderTimedRead = (label: string, timed: TimedRead) => (
    <Pressable style={({ pressed }) => [styles.timedRow, pressed && styles.pressed]} onPress={() => openBook(timed.entry)}>
      {coverOf(timed.entry, 'S') ? (
        <Image source={{ uri: coverOf(timed.entry, 'S') }} style={styles.timedCover} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.timedCover, styles.timedCoverFallback]}>
          <Ionicons name="book" size={18} color={colors.placeholder} />
        </View>
      )}
      <View style={styles.timedInfo}>
        <Text style={styles.timedLabel}>{label}</Text>
        <Text style={styles.timedTitle} numberOfLines={1}>
          {timed.entry.title}
        </Text>
        <Text style={styles.timedDays}>{timed.days === 1 ? 'Lu en 1 jour' : `Lu en ${timed.days} jours`}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
    </Pressable>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.yearRow}>
        <Pressable onPress={() => olderYear && setYear(olderYear)} disabled={!olderYear} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={olderYear ? colors.primaryText : colors.border} />
        </Pressable>
        <Text style={styles.yearText}>{year}</Text>
        <Pressable onPress={() => newerYear && setYear(newerYear)} disabled={!newerYear} hitSlop={12}>
          <Ionicons name="chevron-forward" size={24} color={newerYear ? colors.primaryText : colors.border} />
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroNumber}>{summary.books.length}</Text>
        <Text style={styles.heroLabel}>
          {summary.books.length > 1 ? 'livres lus' : 'livre lu'} en {year}
        </Text>
        {likedCount > 0 && <Text style={styles.heroSub}>dont {plural(likedCount, 'coup de cœur', 'coups de cœur')}</Text>}
      </View>

      {summary.books.length === 0 ? (
        <Text style={styles.empty}>
          Aucun livre terminé en {year} pour l'instant. Marque un livre « Lu » et il apparaîtra ici, au mois de sa date de fin.
        </Text>
      ) : (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statTile}>
              <Ionicons name="star" size={18} color={colors.accentOrange} />
              <Text style={styles.statValue}>{summary.averageRating !== null ? String(summary.averageRating).replace('.', ',') : '–'}</Text>
              <Text style={styles.statLabel}>
                {summary.averageRating !== null ? `note moyenne (${plural(summary.ratedCount, 'livre noté', 'livres notés')})` : 'aucun livre noté'}
              </Text>
            </View>
            <View style={styles.statTile}>
              <Ionicons name="time-outline" size={18} color={colors.accentBlue} />
              <Text style={styles.statValue}>{summary.averageDays !== null ? summary.averageDays : '–'}</Text>
              <Text style={styles.statLabel}>
                {summary.averageDays !== null ? (summary.averageDays > 1 ? 'jours par livre en moyenne' : 'jour par livre en moyenne') : 'aucune date de début'}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Mois par mois</Text>
          <View style={styles.chart}>
            {summary.months.map((m) => (
              <View key={m.month} style={styles.barColumn}>
                <Text style={styles.barCount}>{m.books.length > 0 ? m.books.length : ''}</Text>
                <View
                  style={[
                    styles.bar,
                    { height: m.books.length > 0 ? Math.max(6, (m.books.length / maxPerMonth) * BAR_MAX_HEIGHT) : 2 },
                    m.books.length === 0 && styles.barEmpty,
                  ]}
                />
                <Text style={styles.barLabel}>{MONTH_INITIALS[m.month - 1]}</Text>
              </View>
            ))}
          </View>

          {(summary.fastest || summary.slowest) && (
            <View style={styles.timedSection}>
              {summary.fastest && renderTimedRead('Lecture la plus rapide', summary.fastest)}
              {summary.slowest && renderTimedRead('Lecture la plus longue', summary.slowest)}
            </View>
          )}

          {monthsWithBooks.map((m) => (
            <View key={m.month} style={styles.monthSection}>
              <Text style={styles.sectionTitle}>
                {MONTH_NAMES[m.month - 1]} <Text style={styles.monthCount}>· {plural(m.books.length, 'livre', 'livres')}</Text>
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
                {/* Le plus récemment terminé en premier, comme les mois. */}
                {[...m.books].reverse().map((entry) => (
                  <BookCard
                    key={entry.id}
                    title={entry.title}
                    authors={entry.authors}
                    caption={describeReadingPeriod(entry.startedAt, entry.finishedAt) ?? undefined}
                    coverUrl={coverOf(entry, 'M')}
                    onPress={() => openBook(entry)}
                    width={ROW_CARD_WIDTH}
                  />
                ))}
              </ScrollView>
            </View>
          ))}
        </>
      )}

      {/* Pas de rattrapage automatique des dates ("Dates de lecture") : on invite à compléter celles qui manquent. */}
      {summary.undatedCount > 0 && (
        <Pressable
          style={({ pressed }) => [styles.undatedHint, pressed && styles.pressed]}
          onPress={() => navigation.navigate('ListDetail', { listId: DEFAULT_LIST_IDS.read, listName: 'Lu', isDefault: true })}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.accentSage} />
          <Text style={styles.undatedText}>
            {summary.undatedCount > 1
              ? `${summary.undatedCount} livres « Lu » n'ont pas de date de fin et ne comptent dans aucune année. Ouvre-les pour l'ajouter.`
              : "1 livre « Lu » n'a pas de date de fin et ne compte dans aucune année. Ouvre-le pour l'ajouter."}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.placeholder} />
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  pressed: { opacity: 0.7 },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, marginBottom: spacing.md },
  yearText: { ...typography.hero },
  heroCard: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.lg, alignItems: 'center', marginBottom: spacing.md },
  heroNumber: { ...typography.hero, fontSize: 56, color: colors.accentOrange },
  heroLabel: { ...typography.title },
  heroSub: { ...typography.body, color: colors.accentPink, marginTop: spacing.xs },
  empty: { ...typography.body, textAlign: 'center', marginTop: spacing.md, marginHorizontal: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statTile: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  statValue: { ...typography.title, fontSize: 24, marginTop: spacing.xs },
  statLabel: { ...typography.body, fontSize: 12, marginTop: 2 },
  sectionTitle: { ...typography.title, fontSize: 16, marginBottom: spacing.sm },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  barColumn: { flex: 1, alignItems: 'center' },
  barCount: { fontSize: 11, fontWeight: '600', color: colors.secondaryText, marginBottom: 2 },
  bar: { width: 14, borderRadius: 4, backgroundColor: colors.accentOrange },
  barEmpty: { backgroundColor: colors.border },
  barLabel: { fontSize: 11, color: colors.placeholder, marginTop: spacing.xs },
  timedSection: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.lg },
  timedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  timedCover: { width: 40, height: 60, borderRadius: 4, backgroundColor: colors.surfaceAlt },
  timedCoverFallback: { alignItems: 'center', justifyContent: 'center' },
  timedInfo: { flex: 1, marginHorizontal: spacing.md },
  timedLabel: { ...typography.label },
  timedTitle: { ...typography.title, fontSize: 15, marginTop: 2 },
  timedDays: { fontSize: 12, color: colors.accentSage, marginTop: 2 },
  monthSection: { marginBottom: spacing.sm },
  monthCount: { ...typography.body, fontWeight: '400' },
  rowContent: { gap: spacing.md, paddingRight: spacing.lg },
  undatedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  undatedText: { ...typography.body, flex: 1, fontSize: 13 },
});
