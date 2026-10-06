import { isReadingDay } from '../../utils/readingDates';
import type { LibraryEntry } from '../entities/LibraryEntry';
import type { LibraryRepository } from '../repositories/LibraryRepository';

/**
 * Statut de lecture et appartenance aux listes passent par `toggleBookList`
 * (voir ReadingList.ts) — ce usecase gère la note chiffrée (`rating`), le
 * texte (`note`) et, depuis "Dates de lecture" (08/10/2026), les dates de
 * début/fin de lecture (`startedAt`/`finishedAt`, jours `YYYY-MM-DD`).
 * Une date à `undefined` EFFACE la date.
 */
export type LibraryEntryPatch = Partial<Pick<LibraryEntry, 'rating' | 'note' | 'startedAt' | 'finishedAt'>>;

/**
 * Garde-fou sur les dates d'un patch : une date qui n'est pas un vrai jour
 * `YYYY-MM-DD`, ou qui placerait la fin AVANT le début, est ignorée (le reste
 * du patch — note, étoiles — passe). L'interface borne déjà le sélecteur de
 * dates ; ceci protège la donnée si un autre appelant se trompe.
 */
function sanitizeDates(entry: LibraryEntry, patch: LibraryEntryPatch): LibraryEntryPatch {
  const hasStart = 'startedAt' in patch;
  const hasFinish = 'finishedAt' in patch;
  if (!hasStart && !hasFinish) return patch;

  const { startedAt: patchStart, finishedAt: patchFinish, ...rest } = patch;
  const startedAt = hasStart ? patchStart : entry.startedAt;
  const finishedAt = hasFinish ? patchFinish : entry.finishedAt;

  const validStart = startedAt === undefined || isReadingDay(startedAt);
  const validFinish = finishedAt === undefined || isReadingDay(finishedAt);
  const ordered = startedAt === undefined || finishedAt === undefined || finishedAt >= startedAt; // `YYYY-MM-DD` se compare comme du texte
  if (!validStart || !validFinish || !ordered) return rest;

  return {
    ...rest,
    ...(hasStart ? { startedAt } : {}),
    ...(hasFinish ? { finishedAt } : {}),
  };
}

export async function updateLibraryEntry(
  repo: LibraryRepository,
  currentEntries: LibraryEntry[],
  id: string,
  patch: LibraryEntryPatch,
): Promise<LibraryEntry[]> {
  const next = currentEntries.map((e) => {
    if (e.id !== id) return e;
    const safePatch = sanitizeDates(e, patch);
    // Une NOUVELLE note est une activité visible dans le fil des abonnés
    // (voir `LibraryEntry.activityAt`) ; modifier seulement le texte de la
    // note personnelle, ou redonner la même note, n'en est pas une. Idem pour
    // les dates de lecture : les corriger n'est pas une activité.
    const ratingChanged = 'rating' in safePatch && safePatch.rating !== e.rating;
    return { ...e, ...safePatch, ...(ratingChanged ? { activityAt: new Date().toISOString() } : {}) };
  });
  await repo.saveAll(next);
  return next;
}
