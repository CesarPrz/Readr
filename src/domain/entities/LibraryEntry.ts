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
  /**
   * Date ISO de la dernière ACTIVITÉ de lecture sur ce livre ("Fil d'amis",
   * 08/10/2026) : posée à l'ajout, puis à chaque changement de statut de
   * lecture (À lire/En cours/Lu, voir `toggleBookList`) ou de note (voir
   * `updateLibraryEntry`) — PAS à chaque écriture (une note de texte, un like
   * ou une liste perso n'en font pas une "activité" à montrer aux abonnés).
   * C'est ce champ, et non `updatedAt` côté Firestore, qui ordonne le fil :
   * `updatedAt` est réécrit pour TOUTES les entrées à chaque démarrage par la
   * sauvegarde en masse (`syncLibraryToCloud`), il ne dit donc rien de
   * l'activité réelle. Absent sur les entrées antérieures à cette
   * fonctionnalité — la synchronisation le remplace alors par `addedAt`.
   */
  activityAt?: string;
};
