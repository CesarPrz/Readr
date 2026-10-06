import { toReadingDay } from '../../utils/readingDates';
import type { Book } from '../entities/Book';
import type { LibraryEntry } from '../entities/LibraryEntry';
import { DEFAULT_LIST_IDS } from '../entities/ReadingList';
import type { LibraryRepository } from '../repositories/LibraryRepository';
import { applyStatusDates } from './applyStatusDates';

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

  const now = new Date().toISOString();
  const base: LibraryEntry = {
    id: book.id,
    workKeys: book.workKeys,
    title: book.title,
    authors: book.authors,
    coverId: book.coverId,
    coverUrl: book.coverUrl,
    description: book.description,
    languages: book.languages,
    listIds: [initialListId],
    addedAt: now,
    activityAt: now, // voir `LibraryEntry.activityAt`
  };
  // Ajouté directement « En cours » ou « Lu » : les dates de lecture sont posées comme pour un changement de statut.
  const entry = applyStatusDates(base, initialListId, toReadingDay());
  const next = [entry, ...currentEntries];
  await repo.saveAll(next);
  return next;
}
