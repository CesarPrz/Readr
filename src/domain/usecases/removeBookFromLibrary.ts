import type { LibraryEntry } from '../entities/LibraryEntry';
import type { LibraryRepository } from '../repositories/LibraryRepository';

export async function removeBookFromLibrary(
  repo: LibraryRepository,
  currentEntries: LibraryEntry[],
  id: string,
): Promise<LibraryEntry[]> {
  const next = currentEntries.filter((e) => e.id !== id);
  await repo.saveAll(next);
  return next;
}
