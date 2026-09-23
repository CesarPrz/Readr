export type ReadingStatus = 'to_read' | 'reading' | 'read';

/** A book the user has saved to their local library. */
export type LibraryEntry = {
  id: string;
  title: string;
  authors: string[];
  coverId?: number;
  status: ReadingStatus;
  rating?: number; // 1–5, optional
  note?: string;
  addedAt: string; // ISO date string
};
