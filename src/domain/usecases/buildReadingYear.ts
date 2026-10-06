import { isReadingDay, readingDays } from '../../utils/readingDates';
import type { LibraryEntry } from '../entities/LibraryEntry';
import { DEFAULT_LIST_IDS } from '../entities/ReadingList';

/** Un mois de l'année de lecture : `month` de 1 à 12, livres terminés ce mois-là (ordre de fin croissant). */
export type ReadingMonth = {
  month: number;
  books: LibraryEntry[];
};

/** Un livre et sa durée de lecture en jours (début et fin compris), pour « le plus rapide » / « le plus long ». */
export type TimedRead = {
  entry: LibraryEntry;
  days: number;
};

/**
 * Bilan d'une année de lecture ("Mon année de lecture", 06/10/2026) : les
 * livres de la liste « Lu » dont la date de fin (`finishedAt`) tombe dans
 * l'année, regroupés par mois, avec quelques chiffres. Calculé à la volée
 * depuis la bibliothèque déjà en mémoire : rien de stocké, rien à
 * synchroniser.
 */
export type ReadingYearSummary = {
  year: number;
  /** Livres terminés dans l'année, du premier au dernier terminé. */
  books: LibraryEntry[];
  /** Toujours 12 mois, vides compris (pour l'histogramme). */
  months: ReadingMonth[];
  /** Moyenne des notes données aux livres de l'année, à une décimale ; `null` si aucun n'est noté. */
  averageRating: number | null;
  ratedCount: number;
  /** Durée moyenne de lecture en jours, arrondie ; `null` si aucun livre de l'année n'a de date de début. */
  averageDays: number | null;
  fastest: TimedRead | null;
  slowest: TimedRead | null;
  /**
   * Livres « Lu » SANS date de fin, toutes années confondues : ils ne
   * peuvent compter dans aucune année (pas de rattrapage automatique, voir
   * "Dates de lecture"). Affiché pour inviter à compléter la date.
   */
  undatedCount: number;
};

/** Année et mois (1–12) d'un jour `YYYY-MM-DD` valide, `null` sinon. */
function yearMonth(value: string | undefined): { year: number; month: number } | null {
  if (!isReadingDay(value)) return null;
  return { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) };
}

const isRead = (entry: LibraryEntry) => entry.listIds.includes(DEFAULT_LIST_IDS.read);

/**
 * Années pour lesquelles au moins un livre « Lu » a une date de fin, plus
 * l'année en cours (toujours proposée, même vide), de la plus récente à la
 * plus ancienne.
 */
export function readingYears(entries: LibraryEntry[], currentYear: number): number[] {
  const years = new Set<number>([currentYear]);
  for (const entry of entries) {
    const end = isRead(entry) ? yearMonth(entry.finishedAt) : null;
    if (end) years.add(end.year);
  }
  return [...years].sort((a, b) => b - a);
}

export function buildReadingYear(entries: LibraryEntry[], year: number): ReadingYearSummary {
  const read = entries.filter(isRead);
  const books = read
    .filter((entry) => yearMonth(entry.finishedAt)?.year === year)
    // Même jour de fin : l'ordre d'ajout départage, pour un résultat stable.
    .sort((a, b) => a.finishedAt!.localeCompare(b.finishedAt!) || a.addedAt.localeCompare(b.addedAt));

  const months: ReadingMonth[] = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, books: [] }));
  for (const entry of books) months[yearMonth(entry.finishedAt)!.month - 1].books.push(entry);

  const rated = books.filter((entry) => typeof entry.rating === 'number' && entry.rating > 0);
  const averageRating = rated.length
    ? Math.round((rated.reduce((sum, entry) => sum + entry.rating!, 0) / rated.length) * 10) / 10
    : null;

  const timed: TimedRead[] = [];
  for (const entry of books) {
    const days = readingDays(entry.startedAt, entry.finishedAt);
    if (days !== null) timed.push({ entry, days });
  }
  const averageDays = timed.length ? Math.round(timed.reduce((sum, t) => sum + t.days, 0) / timed.length) : null;
  // À durée égale, le premier terminé dans l'année l'emporte (`timed` suit l'ordre de `books`).
  const fastest = timed.reduce<TimedRead | null>((best, t) => (!best || t.days < best.days ? t : best), null);
  const slowest = timed.reduce<TimedRead | null>((best, t) => (!best || t.days > best.days ? t : best), null);

  return {
    year,
    books,
    months,
    averageRating,
    ratedCount: rated.length,
    averageDays,
    fastest,
    // Un seul livre chronométré : pas de « plus long » distinct du « plus rapide ».
    slowest: timed.length > 1 ? slowest : null,
    undatedCount: read.filter((entry) => !yearMonth(entry.finishedAt)).length,
  };
}
