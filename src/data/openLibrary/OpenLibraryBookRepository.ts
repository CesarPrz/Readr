import type { Book } from '../../domain/entities/Book';
import type { BookDetail } from '../../domain/entities/BookDetail';
import type { BookRepository, SearchBooksResult } from '../../domain/repositories/BookRepository';
import { findByIsbnOnBnf } from '../bnf/bnfClient';
import { findByIsbnOnGoogleBooks } from '../googleBooks/googleBooksClient';
import { catalogEntryToBook, docsToBooks, toBookDetail } from './mappers';
import type { EditionsResponse, RawEdition, RawIsbnEdition, SearchResponse, WorkDetail } from './types';

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

  async findByIsbn(isbn: string): Promise<Book | undefined> {
    const { books } = await this.search(`isbn:${isbn}`, 1);
    if (books.length > 0) return books[0];

    // L'index de recherche (search.json) n'indexe pas toutes les éditions du
    // catalogue — beaucoup d'éditions de poche françaises (ex. J'ai lu, Le Livre
    // de Poche) en sont absentes alors qu'elles existent bien chez Open Library.
    // `/isbn/<isbn>.json` interroge le catalogue brut directement par clé et
    // trouve souvent l'édition même quand la recherche échoue.
    const fromCatalog = await this.findByIsbnInCatalog(isbn);
    if (fromCatalog) return fromCatalog;

    // Le livre n'existe pas chez Open Library (ni index, ni catalogue) : on
    // interroge Google Books, qui a une bonne couverture internationale et
    // renvoie une couverture (Book.coverUrl) — ce qu'Open Library comme la
    // BnF ne peuvent pas offrir ici. Nécessite une clé API configurée (voir
    // googleBooksClient.ts) ; sinon ce repli est silencieusement sauté.
    const fromGoogleBooks = await findByIsbnOnGoogleBooks(isbn);
    if (fromGoogleBooks) return fromGoogleBooks;

    // Dernier recours : ni Open Library ni Google Books n'ont ce livre — cas
    // rencontré en pratique sur des éditions de poche françaises très
    // pointues (ex. Dracula chez J'ai lu, absent des deux à l'époque où ce
    // repli a été ajouté). La BnF n'expose pas de couverture, mais reste la
    // meilleure couverture catalographique pour les livres publiés en France.
    return findByIsbnOnBnf(isbn);
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

  /** Repli de `findByIsbn` : résolution directe par clé dans le catalogue brut, hors index de recherche. */
  private async findByIsbnInCatalog(isbn: string): Promise<Book | undefined> {
    const res = await fetch(`${BASE_URL}/isbn/${isbn}.json`);
    if (!res.ok) return undefined; // vraiment introuvable, y compris dans le catalogue brut

    const edition: RawIsbnEdition = await res.json();
    const workKey = edition.works?.[0]?.key;
    if (!workKey) return undefined; // édition orpheline sans œuvre associée — cas très rare

    const work = await this.fetchWorkDetail(workKey).catch(() => null);
    const authors = await this.fetchAuthorNames(work?.authors ?? []);
    return catalogEntryToBook(workKey, edition, work, authors);
  }

  /** `/isbn/<isbn>.json` et la fiche œuvre ne donnent que des clés auteur — il faut un appel par auteur pour son nom. */
  private async fetchAuthorNames(authors: { author: { key: string } }[]): Promise<string[]> {
    const names = await Promise.all(
      authors.map(async ({ author }) => {
        try {
          const res = await fetch(`${BASE_URL}${author.key}.json`);
          if (!res.ok) return undefined;
          const data: { name?: string } = await res.json();
          return data.name;
        } catch {
          return undefined;
        }
      }),
    );
    return names.filter((n): n is string => !!n);
  }
}
