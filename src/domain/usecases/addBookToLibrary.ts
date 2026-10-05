import type { Book } from '../entities/Book';
import type { LibraryEntry } from '../entities/LibraryEntry';
import { DEFAULT_LIST_IDS } from '../entities/ReadingList';
import type { LibraryRepository } from '../repositories/LibraryRepository';

/**
 * Adds a book to the library unless it's already there, and persists the
 * result. `initialListId` (par défaut "À lire") lets la bulle cœur sur
 * l'écran détail ajouter et aimer un livre en un seul geste
 * (`DEFAULT_LIST_IDS.liked`), sans passer par un `toggleBookList` séparé.
 */
export async function addBookToLibrary(
  repo: LibraryRepository,
  currentEntries: LibraryEntry[],
  book: Book,
  initialListId: string = DEFAULT_LIST_IDS.toRead,
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
    listIds: [initialListId],
    addedAt: new Date().toISOString(),
  };
  const next = [entry, ...currentEntries];
  await repo.saveAll(next);
  return next;
}
