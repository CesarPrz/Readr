import type { BookDetail } from '../../domain/entities/BookDetail';
import type { BookRepository, SearchBooksResult } from '../../domain/repositories/BookRepository';
import { docsToBooks, toBookDetail } from './mappers';
import type { EditionsResponse, RawEdition, SearchResponse, WorkDetail } from './types';

const BASE_URL = 'https://openlibrary.org';
const COVERS_URL = 'https://covers.openlibrary.org';
const PAGE_SIZE = 20;

/** Open Library implementation of the book catalog port. */
export class OpenLibraryBookRepository implements BookRepository {
  async search(query: string, page: number): Promise<SearchBooksResult> {
    const offset = (page - 1) * PAGE_SIZE;
    const fields = ['key', 'title', 'author_name', 'first_publish_year', 'cover_i', 'edition_count', 'language'].join(
      ',',
    );
    const url = `${BASE_URL}/search.json?q=${encodeURIComponent(query)}&limit=${PAGE_SIZE}&offset=${offset}&fields=${fields}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`La recherche a échoué (${res.status})`);
    const data: SearchResponse = await res.json();
    return { books: docsToBooks(data.docs), numFound: data.numFound, fetchedCount: data.docs.length };
  }

  async getDetail(workIds: string[]): Promise<BookDetail> {
    const results = await Promise.all(workIds.map((id) => this.fetchWorkAndEditions(id)));
    const details = results.map((r) => r.detail).filter((d): d is WorkDetail => d !== null);
    const editionsPerWork = results.map((r) => r.editions);
    return toBookDetail(workIds[0], details, editionsPerWork);
  }

  coverUrl(coverId?: number, size: 'S' | 'M' | 'L' = 'M'): string | undefined {
    if (!coverId) return undefined;
    return `${COVERS_URL}/b/id/${coverId}-${size}.jpg`;
  }

  /** One merged book can carry several work keys — a bad/stale one among them shouldn't sink the whole detail fetch. */
  private async fetchWorkAndEditions(workId: string): Promise<{ detail: WorkDetail | null; editions: RawEdition[] }> {
    const editions = await this.fetchEditions(workId); // already resilient — returns [] rather than throwing
    try {
      const detail = await this.fetchWorkDetail(workId);
      return { detail, editions };
    } catch {
      return { detail: null, editions };
    }
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
