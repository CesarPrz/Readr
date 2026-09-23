import type { Book } from '../entities/Book';
import type { BookDetail } from '../entities/BookDetail';

export type SearchBooksResult = {
  books: Book[];
  numFound: number;
};

/**
 * Port for the book catalog. The domain and presentation layers depend only
 * on this interface — never on a concrete data source — so the catalog
 * (Open Library today) can be swapped or supplemented without touching a
 * use case or a screen.
 */
export interface BookRepository {
  search(query: string, page: number): Promise<SearchBooksResult>;
  getDetail(workId: string): Promise<BookDetail>;
  /** Pure, side-effect-free URL formatting — safe for screens to call directly. */
  coverUrl(coverId: number | undefined, size?: 'S' | 'M' | 'L'): string | undefined;
}
