import type { LibraryEntry } from '../entities/LibraryEntry';
import type { LibraryRepository } from '../repositories/LibraryRepository';

/** Statut de lecture et appartenance aux listes passent désormais par `toggleBookList` (voir ReadingList.ts) — ce usecase ne gère plus que note/note. */
export type LibraryEntryPatch = Partial<Pick<LibraryEntry, 'rating' | 'note'>>;

export async function updateLibraryEntry(
  repo: LibraryRepository,
  currentEntries: LibraryEntry[],
  id: string,
  patch: LibraryEntryPatch,
): Promise<LibraryEntry[]> {
  const next = currentEntries.map((e) => (e.id === id ? { ...e, ...patch } : e));
  await repo.saveAll(next);
  return next;
}
