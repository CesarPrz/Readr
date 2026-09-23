import type { BookDetail } from '../../domain/entities/BookDetail';
import type { BookRepository, SearchBooksResult } from '../../domain/repositories/BookRepository';
import { docToBook, toBookDetail } from './mappers';
import type { EditionsResponse, RawEdition, SearchResponse, WorkDetail } from './types';

const BASE_URL = 'https://openlibrary.org';
const COVERS_URL = 'https://covers.openlibrary.org';
const PAGE_SIZE = 20;

/** Open Library implementation of the book catalog port. */
export class OpenLibraryBookRepository implements BookRepository {
  async search(query: string, page: number): Promise<SearchBooksResult> {
    const offset = (page - 1) * PAGE_SIZE;
    const fields = ['key', 'title', 'author_name', 'first_publish_year', 'cover_i', 'edition_count'].join(',');
    const url = `${BASE_URL}/search.json?q=${encodeURIComponent(query)}&limit=${PAGE_SIZE}&offset=${offset}&fields=${fields}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`La recherche a échoué (${res.status})`);
    const data: SearchResponse = await res.json();
    return { books: data.docs.map(docToBook), numFound: data.numFound };
  }

  async getDetail(workId: string): Promise<BookDetail> {
    const [detail, rawEditions] = await Promise.all([this.fetchWorkDetail(workId), this.fetchEditions(workId)]);
    return toBookDetail(workId, detail, rawEditions);
  }

  coverUrl(coverId?: number, size: 'S' | 'M' | 'L' = 'M'): string | undefined {
    if (!coverId) return undefined;
    return `${COVERS_URL}/b/id/${coverId}-${size}.jpg`;
  }

  private async fetchWorkDetail(workId: string): Promise<WorkDetail> {
    const res = await fetch(`${BASE_URL}${workId}.json`);
    if (!res.ok) throw new Error(`Impossible de charger ce livre (${res.status})`);
    return res.json();
  }

  private async fetchEditions(workId: string, limit = 25): Promise<RawEdition[]> {
    const res = await fetch(`${BASE_URL}${workId}/editions.json?limit=${limit}`);
    if (!res.ok) return []; // not every work has edition data — "none found", not a hard error
    const data: EditionsResponse = await res.json();
    return data.entries ?? [];
  }
}
