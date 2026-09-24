import type { Book } from '../entities/Book';
import type { LibraryEntry, ReadingStatus } from '../entities/LibraryEntry';
import type { LibraryRepository } from '../repositories/LibraryRepository';

/**
 * Adds a book to the library unless it's already there, and persists the
 * result. `liked` lets the heart bubble on the detail screen add-and-like a
 * book in one tap, without going through a separate `updateLibraryEntry` call.
 */
export async function addBookToLibrary(
  repo: LibraryRepository,
  currentEntries: LibraryEntry[],
  book: Book,
  status: ReadingStatus = 'to_read',
  liked = false,
): Promise<LibraryEntry[]> {
  if (currentEntries.some((e) => e.id === book.id)) return currentEntries;

  const entry: LibraryEntry = {
    id: book.id,
    workKeys: book.workKeys,
    title: book.title,
    authors: book.authors,
    coverId: book.coverId,
    coverUrl: book.coverUrl,
    description: book.description,
    languages: book.languages,
    status,
    liked,
    addedAt: new Date().toISOString(),
  };
  const next = [entry, ...currentEntries];
  await repo.saveAll(next);
  return next;
}
