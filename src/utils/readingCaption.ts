import type { LibraryEntry } from '../domain/entities/LibraryEntry';
import { DEFAULT_LIST_IDS } from '../domain/entities/ReadingList';
import { describeReadingPeriod } from './readingDates';

/**
 * Légende de dates sous une couverture dans une liste ("Dates de lecture",
 * 08/10/2026) : « Du 3 oct. au 12 oct. 2026 » dans « Lu », « Commencé le
 * 3 oct. 2026 » dans « En cours » ; rien dans les autres listes (une liste
 * perso ou « Aimés » ne dit pas où en est la lecture), ni quand aucune date
 * n'est renseignée. Une `finishedAt` restée sur un livre repassé « En cours »
 * n'est volontairement pas montrée.
 */
export function readingCaption(entry: LibraryEntry, listId: string): string | undefined {
  if (listId === DEFAULT_LIST_IDS.read) return describeReadingPeriod(entry.startedAt, entry.finishedAt) ?? undefined;
  if (listId === DEFAULT_LIST_IDS.reading) return describeReadingPeriod(entry.startedAt, undefined) ?? undefined;
  return undefined;
}
