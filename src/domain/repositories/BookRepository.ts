import type { Book } from '../entities/Book';
import type { BookDetail } from '../entities/BookDetail';

export type SearchBooksResult = {
  books: Book[]; // already de-duplicated/grouped — may be fewer than fetchedCount
  numFound: number; // total raw matches reported by the catalog, before grouping
  fetchedCount: number; // raw doc count returned for this page, before grouping — used to know when pagination is exhausted
};

/**
 * Port for the book catalog. The domain and presentation layers depend only
 * on this interface — never on a concrete data source — so the catalog
 * (Open Library today) can be swapped or supplemented without touching a
 * use case or a screen.
 */
export interface BookRepository {
  search(query: string, page: number): Promise<SearchBooksResult>;
  /** Looks up a single book by its ISBN (as scanned from a barcode, for instance). `undefined` when nothing matches. */
  findByIsbn(isbn: string): Promise<Book | undefined>;
  /** `workIds` is every work key merged into one `Book` (see `Book.workKeys`) — their editions/description are merged into one detail. */
  getDetail(workIds: string[]): Promise<BookDetail>;
  /** Pure, side-effect-free URL formatting — safe for screens to call directly. */
  coverUrl(coverId: number | undefined, size?: 'S' | 'M' | 'L'): string | undefined;
}
