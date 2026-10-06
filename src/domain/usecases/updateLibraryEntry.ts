import type { LibraryEntry } from '../entities/LibraryEntry';
import type { LibraryRepository } from '../repositories/LibraryRepository';

/** Statut de lecture et appartenance aux listes passent désormais par `toggleBookList` (voir ReadingList.ts) — ce usecase ne gère plus que la note chiffrée (`rating`) et le texte (`note`). */
export type LibraryEntryPatch = Partial<Pick<LibraryEntry, 'rating' | 'note'>>;

export async function updateLibraryEntry(
  repo: LibraryRepository,
  currentEntries: LibraryEntry[],
  id: string,
  patch: LibraryEntryPatch,
): Promise<LibraryEntry[]> {
  const next = currentEntries.map((e) => {
    if (e.id !== id) return e;
    // Une NOUVELLE note est une activité visible dans le fil des abonnés
    // (voir `LibraryEntry.activityAt`) ; modifier seulement le texte de la
    // note personnelle, ou redonner la même note, n'en est pas une.
    const ratingChanged = 'rating' in patch && patch.rating !== e.rating;
    return { ...e, ...patch, ...(ratingChanged ? { activityAt: new Date().toISOString() } : {}) };
  });
  await repo.saveAll(next);
  return next;
}
