import type { Book } from '../../domain/entities/Book';
import type { BookDetail } from '../../domain/entities/BookDetail';
import type { Edition } from '../../domain/entities/Edition';
import type { OpenLibraryDoc, RawEdition, WorkDetail } from './types';

export function docToBook(doc: OpenLibraryDoc): Book {
  return {
    id: doc.key,
    title: doc.title,
    authors: doc.author_name ?? [],
    coverId: doc.cover_i,
    firstPublishYear: doc.first_publish_year,
  };
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

export function toBookDetail(workId: string, detail: WorkDetail, rawEditions: RawEdition[]): BookDetail {
  return {
    id: workId,
    description: workDescriptionText(detail),
    editions: rawEditions.map(rawEditionToEdition),
    hasAudioEdition: rawEditions.some((e) => (e.physical_format ?? '').toLowerCase().includes('audio')),
  };
}
