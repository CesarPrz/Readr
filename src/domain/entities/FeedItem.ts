import type { LibraryEntry } from './LibraryEntry';

/** Ce que l'abonné a fait : a lu le livre, l'a commencé, ou l'a seulement noté (sans l'avoir marqué lu/en cours). */
export type FeedItemKind = 'read' | 'reading' | 'rated';

/** Un lecteur suivi, tel qu'affiché sur une ligne du fil. */
export type FeedUser = {
  uid: string;
  username: string;
  photoUrl?: string;
};

/**
 * Une ligne du "Fil d'amis" (08/10/2026, plan Firebase) : une activité de
 * lecture d'un lecteur suivi, à la Letterboxd — qui, quoi, quelle note,
 * quand. Dérivée de l'ÉTAT ACTUEL de son entrée de bibliothèque (pas d'un
 * journal d'évènements : il n'existe pas), donc un livre qu'il a lu puis
 * remis "à lire" disparaît du fil, et un livre lu apparaît une seule fois à
 * la date de sa dernière activité (`LibraryEntry.activityAt`).
 */
export type FeedItem = {
  id: string; // `${uid}:${entry.id}` — stable, unique par lecteur et par livre
  user: FeedUser;
  entry: LibraryEntry;
  kind: FeedItemKind;
  at: string; // ISO — `entry.activityAt`, ou `addedAt` en repli
};
