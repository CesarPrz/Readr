/** Raw shapes returned by the Google Books API — not for use outside this folder. */
export type GoogleBooksVolumeInfo = {
  title?: string;
  authors?: string[];
  language?: string; // single ISO code (e.g. "fr"), unlike Open Library's per-edition list
};

export type GoogleBooksVolume = {
  volumeInfo?: GoogleBooksVolumeInfo;
};

export type GoogleBooksResponse = {
  totalItems: number;
  items?: GoogleBooksVolume[];
};
