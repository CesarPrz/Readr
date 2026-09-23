import type { Edition } from './Edition';

/** Enrichment data fetched for a single book once its detail screen opens. */
export type BookDetail = {
  id: string;
  description?: string;
  editions: Edition[];
  hasAudioEdition: boolean;
};
