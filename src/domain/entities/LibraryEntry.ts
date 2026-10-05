/** A book the user has saved to their local library. */
export type LibraryEntry = {
  id: string;
  workKeys: string[]; // every catalog work key merged into this book, kept so its detail page can re-fetch all editions/languages
  title: string;
  authors: string[];
  coverId?: number;
  coverUrl?: string; // voir Book.coverUrl — couverture déjà résolue, pour les livres venus d'une source sans coverId Open Library
  description?: string; // voir Book.description — résumé déjà connu, pour les livres venus d'une source sans fiche "œuvre" Open Library
  languages: string[];
  /**
   * Ids des `ReadingList` auxquelles ce livre appartient actuellement (voir
   * ReadingList.ts) — remplace les anciens champs `status`/`liked`. Un livre
   * peut appartenir à plusieurs listes à la fois, sauf pour les 3 listes
   * `exclusive` (À lire/En cours/Lu), voir `toggleBookList`.
   */
  listIds: string[];
  rating?: number; // 1–5, optional
  note?: string;
  addedAt: string; // ISO date string
};
