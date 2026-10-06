import type { LibraryEntry } from '../entities/LibraryEntry';
import { DEFAULT_LIST_IDS } from '../entities/ReadingList';

/**
 * Remplit automatiquement les dates de lecture quand le statut d'un livre
 * change ("Dates de lecture", 08/10/2026) — décision produit : « En cours »
 * pose le début à aujourd'hui ; « Lu » pose la fin à aujourd'hui, et le début
 * aussi s'il est vide (un livre marqué lu d'un coup a été lu "en un jour").
 *
 * Règle d'or : on NE REMPLACE JAMAIS une date déjà renseignée, qu'elle ait été
 * saisie à la main ou posée par un changement de statut précédent. Les autres
 * statuts (À lire…) et les autres listes ne touchent à aucune date. Fonction
 * pure partagée par `toggleBookList` et `addBookToLibrary` (un livre peut être
 * ajouté directement "En cours" ou "Lu").
 *
 * `today` : jour local `YYYY-MM-DD` (voir `toReadingDay`), injecté pour les tests.
 */
export function applyStatusDates(entry: LibraryEntry, statusListId: string, today: string): LibraryEntry {
  if (statusListId === DEFAULT_LIST_IDS.reading) {
    return entry.startedAt ? entry : { ...entry, startedAt: today };
  }
  if (statusListId === DEFAULT_LIST_IDS.read) {
    const startedAt = entry.startedAt ?? today;
    const finishedAt = entry.finishedAt ?? today;
    if (startedAt === entry.startedAt && finishedAt === entry.finishedAt) return entry;
    return { ...entry, startedAt, finishedAt };
  }
  return entry;
}
