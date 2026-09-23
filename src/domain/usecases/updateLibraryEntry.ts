import type { LibraryEntry } from '../entities/LibraryEntry';
import type { LibraryRepository } from '../repositories/LibraryRepository';

export type LibraryEntryPatch = Partial<Pick<LibraryEntry, 'status' | 'rating' | 'note'>>;

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
