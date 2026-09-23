/** Raw shapes returned by the Open Library HTTP API — not for use outside this folder. */
export type OpenLibraryDoc = {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  edition_count?: number;
  language?: string[]; // languages found across this work's editions, per Open Library's own aggregation
};

export type SearchResponse = {
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

export type RawEdition = {
  key: string;
  title?: string;
  publish_date?: string;
  physical_format?: string;
  publishers?: string[];
  covers?: number[];
  languages?: { key: string }[]; // e.g. [{ key: "/languages/fre" }]
};

export type EditionsResponse = {
  entries: RawEdition[];
};
