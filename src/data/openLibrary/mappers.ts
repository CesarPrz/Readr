import type { Book } from '../../domain/entities/Book';
import type { BookDetail } from '../../domain/entities/BookDetail';
import type { Edition } from '../../domain/entities/Edition';
import type { OpenLibraryDoc, RawEdition, RawIsbnEdition, WorkDetail } from './types';

/**
 * Open Library's search index frequently holds several separate "work"
 * records for what is really the same book — duplicate catalog entries, and
 * translations that were never linked to a shared work. This groups search
 * hits that are very likely the same book (same normalized title + first
 * author) into a single `Book`, merging their work keys and languages so the
 * detail screen can fetch and combine editions from all of them.
 *
 * This is a heuristic, not a guarantee: two unrelated books that happen to
 * share a title and a first author's name would be merged too. Grouping only
 * happens within the docs of a single fetched page, not across pages.
 */
export function docsToBooks(docs: OpenLibraryDoc[]): Book[] {
  const groups = new Map<string, OpenLibraryDoc[]>();
  for (const doc of docs) {
    const key = groupKey(doc);
    const group = groups.get(key);
    if (group) group.push(doc);
    else groups.set(key, [doc]);
  }

  return Array.from(groups.values(), docsToBook);
}

function groupKey(doc: OpenLibraryDoc): string {
  const author = doc.author_name?.[0] ?? '';
  return `${normalize(doc.title)}::${normalize(author)}`;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function docsToBook(group: OpenLibraryDoc[]): Book {
  // The doc with the most known editions is taken as the most complete/authoritative record for title/author/year.
  const primary = [...group].sort((a, b) => (b.edition_count ?? 0) - (a.edition_count ?? 0))[0];
  const coverId = group.find((d) => d.cover_i !== undefined)?.cover_i ?? primary.cover_i;
  const years = group.map((d) => d.first_publish_year).filter((y): y is number => y !== undefined);

  return {
    id: primary.key,
    workKeys: group.map((d) => d.key),
    title: primary.title,
    authors: primary.author_name ?? [],
    coverId,
    firstPublishYear: years.length > 0 ? Math.min(...years) : undefined,
    languages: dedupe(group.flatMap((d) => d.language ?? [])),
  };
}

function dedupe<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function editionFormatLabel(edition: RawEdition): string {
  return edition.physical_format?.trim() || 'Format inconnu';
}

function rawEditionToEdition(edition: RawEdition): Edition {
  return { id: edition.key, formatLabel: editionFormatLabel(edition) };
}

function workDescriptionText(detail: WorkDetail): string | undefined {
  if (!detail.description) return undefined;
  return typeof detail.description === 'string' ? detail.description : detail.description.value;
}

function languageCode(ref: { key: string }): string {
  return ref.key.split('/').pop() ?? ref.key;
}

/**
 * Construit un `Book` directement depuis une fiche catalogue (`/isbn/<isbn>.json`)
 * — le repli de `findByIsbn` quand l'ISBN scanné n'est pas dans l'index de
 * recherche. Moins riche qu'un résultat de recherche classique (pas d'année de
 * première publication, pas de fusion multi-éditions), mais suffisant pour
 * identifier le livre scanné et l'ajouter à la bibliothèque.
 */
export function catalogEntryToBook(
  workKey: string,
  edition: RawIsbnEdition,
  work: WorkDetail | null,
  authors: string[],
): Book {
  return {
    id: workKey,
    workKeys: [workKey],
    title: work?.title ?? edition.title ?? 'Titre inconnu',
    authors,
    coverId: edition.covers?.[0] ?? work?.covers?.[0],
    languages: dedupe((edition.languages ?? []).map(languageCode)),
  };
}

function dedupeEditionsByKey(editions: RawEdition[]): RawEdition[] {
  const seen = new Set<string>();
  const result: RawEdition[] = [];
  for (const edition of editions) {
    if (seen.has(edition.key)) continue;
    seen.add(edition.key);
    result.push(edition);
  }
  return result;
}

/** Merges the work details and editions fetched for every work key of a (possibly grouped) book into one detail. */
export function toBookDetail(primaryId: string, details: WorkDetail[], rawEditionsPerWork: RawEdition[][]): BookDetail {
  const description = details.map(workDescriptionText).find((d): d is string => !!d);
  const allRawEditions = dedupeEditionsByKey(rawEditionsPerWork.flat());

  return {
    id: primaryId,
    description,
    editions: allRawEditions.map(rawEditionToEdition),
    hasAudioEdition: allRawEditions.some((e) => (e.physical_format ?? '').toLowerCase().includes('audio')),
    languages: dedupe(allRawEditions.flatMap((e) => (e.languages ?? []).map(languageCode))),
  };
}
