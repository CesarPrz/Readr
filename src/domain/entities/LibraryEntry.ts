export type ReadingStatus = 'to_read' | 'reading' | 'read';

/** A book the user has saved to their local library. */
export type LibraryEntry = {
  id: string;
  workKeys: string[]; // every catalog work key merged into this book, kept so its detail page can re-fetch all editions/languages
  title: string;
  authors: string[];
  coverId?: number;
  coverUrl?: string; // voir Book.coverUrl — couverture déjà résolue, pour les livres venus d'une source sans coverId Open Library
  languages: string[];
  status: ReadingStatus;
  rating?: number; // 1–5, optional
  note?: string;
  addedAt: string; // ISO date string
};
