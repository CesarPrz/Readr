import type { Book } from '../entities/Book';
import type { LibraryEntry } from '../entities/LibraryEntry';
import type { BookRepository } from '../repositories/BookRepository';

const MAX_AUTHORS_SAMPLED = 5;
const MAX_RECOMMENDATIONS = 20;

/**
 * Recommends books by the authors already present in the library (whatever
 * their reading status — to-read, in progress or finished), excluding books
 * already saved. Most recently added books weigh more: their authors are
 * sampled first.
 */
export async function getRecommendations(repo: BookRepository, libraryEntries: LibraryEntry[]): Promise<Book[]> {
  if (libraryEntries.length === 0) return [];

  const savedIds = new Set(libraryEntries.map((e) => e.id));
  const authors = distinctAuthorsByRecency(libraryEntries).slice(0, MAX_AUTHORS_SAMPLED);
  if (authors.length === 0) return [];

  const resultsByAuthor = await Promise.all(
    authors.map((author) =>
      repo.search(author, 1).then(
        (result) => result.books,
        () => [] as Book[], // one author's search failing shouldn't break the whole list
      ),
    ),
  );

  const seen = new Set<string>();
  const recommendations: Book[] = [];
  for (const books of resultsByAuthor) {
    for (const book of books) {
      if (savedIds.has(book.id) || seen.has(book.id)) continue;
      seen.add(book.id);
      recommendations.push(book);
    }
  }
  return recommendations.slice(0, MAX_RECOMMENDATIONS);
}

function distinctAuthorsByRecency(entries: LibraryEntry[]): string[] {
  const byRecency = [...entries].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  const authors: string[] = [];
  for (const entry of byRecency) {
    for (const author of entry.authors) {
      if (!authors.includes(author)) authors.push(author);
    }
  }
  return authors;
}
