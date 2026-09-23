export type OpenLibraryDoc = {
  key: string; // e.g. "/works/OL12345W"
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  edition_count?: number;
};

export type SearchResult = {
  numFound: number;
  start: number;
  docs: OpenLibraryDoc[];
};

export type WorkDescription = string | { value: string };

export type WorkDetail = {
  key: string;
  title: string;
  description?: WorkDescription;
  covers?: number[];
};

export type Edition = {
  key: string;
  title?: string;
  publish_date?: string;
  physical_format?: string;
  publishers?: string[];
  covers?: number[];
};

export type EditionsResponse = {
  entries: Edition[];
};

/** Minimal, UI-friendly shape derived from a search hit or a saved entry. */
export type BookSummary = {
  workKey: string;
  title: string;
  authors: string[];
  coverId?: number;
  firstPublishYear?: number;
};
