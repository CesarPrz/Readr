import type { Book } from '../entities/Book';
import type { LibraryEntry, ReadingStatus } from '../entities/LibraryEntry';
import type { LibraryRepository } from '../repositories/LibraryRepository';

/** Adds a book to the library unless it's already there, and persists the result. */
export async function addBookToLibrary(
  repo: LibraryRepository,
  currentEntries: LibraryEntry[],
  book: Book,
  status: ReadingStatus = 'to_read',
): Promise<LibraryEntry[]> {
  if (currentEntries.some((e) => e.id === book.id)) return currentEntries;

  const entry: LibraryEntry = {
    id: book.id,
    workKeys: book.workKeys,
    title: book.title,
    authors: book.authors,
    coverId: book.coverId,
    coverUrl: book.coverUrl,
    languages: book.languages,
    status,
    addedAt: new Date().toISOString(),
  };
  const next = [entry, ...currentEntries];
  await repo.saveAll(next);
  return next;
}
