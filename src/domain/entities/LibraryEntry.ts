export type ReadingStatus = 'to_read' | 'reading' | 'read';

/** A book the user has saved to their local library. */
export type LibraryEntry = {
  id: string;
  workKeys: string[]; // every catalog work key merged into this book, kept so its detail page can re-fetch all editions/languages
  title: string;
  authors: string[];
  coverId?: number;
  languages: string[];
  status: ReadingStatus;
  rating?: number; // 1–5, optional
  note?: string;
  addedAt: string; // ISO date string
};
