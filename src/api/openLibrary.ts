import type {
  BookSummary,
  Edition,
  EditionsResponse,
  OpenLibraryDoc,
  SearchResult,
  WorkDetail,
} from './types';

const BASE_URL = 'https://openlibrary.org';
const COVERS_URL = 'https://covers.openlibrary.org';
const PAGE_SIZE = 20;

/** Open Library serves covers by numeric id, in three sizes. */
export function coverUrl(coverId?: number, size: 'S' | 'M' | 'L' = 'M'): string | undefined {
  if (!coverId) return undefined;
  return `${COVERS_URL}/b/id/${coverId}-${size}.jpg`;
}

export function docToSummary(doc: OpenLibraryDoc): BookSummary {
  return {
    workKey: doc.key,
    title: doc.title,
    authors: doc.author_name ?? [],
    coverId: doc.cover_i,
    firstPublishYear: doc.first_publish_year,
  };
}

/** Search Open Library's catalog. `page` is 1-indexed. */
export async function searchBooks(query: string, page = 1): Promise<SearchResult> {
  const offset = (page - 1) * PAGE_SIZE;
  const fields = ['key', 'title', 'author_name', 'first_publish_year', 'cover_i', 'edition_count'].join(',');
  const url = `${BASE_URL}/search.json?q=${encodeURIComponent(query)}&limit=${PAGE_SIZE}&offset=${offset}&fields=${fields}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`La recherche a échoué (${res.status})`);
  }
  return res.json();
}

/** Fetch a work's own metadata (title, description) by its work key, e.g. "/works/OL12345W". */
export async function getWorkDetail(workKey: string): Promise<WorkDetail> {
  const res = await fetch(`${BASE_URL}${workKey}.json`);
  if (!res.ok) {
    throw new Error(`Impossible de charger ce livre (${res.status})`);
  }
  return res.json();
}

/** Fetch the editions (formats, publishers, dates) known for a work. */
export async function getEditions(workKey: string, limit = 25): Promise<Edition[]> {
  const res = await fetch(`${BASE_URL}${workKey}/editions.json?limit=${limit}`);
  if (!res.ok) {
    // Not every work has edition data — treat it as "none found" rather than a hard error.
    return [];
  }
  const data: EditionsResponse = await res.json();
  return data.entries ?? [];
}

/** Best-effort signal: does any known edition look like an audiobook? */
export function hasAudioEdition(editions: Edition[]): boolean {
  return editions.some((e) => (e.physical_format ?? '').toLowerCase().includes('audio'));
}

export function editionFormatLabel(edition: Edition): string {
  return edition.physical_format?.trim() || 'Format inconnu';
}

export function workDescriptionText(detail: WorkDetail): string | undefined {
  if (!detail.description) return undefined;
  return typeof detail.description === 'string' ? detail.description : detail.description.value;
}
