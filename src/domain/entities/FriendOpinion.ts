import type { FeedUser } from './FeedItem';
import type { LibraryEntry } from './LibraryEntry';

/** Ce qu'un lecteur suivi a fait de CE livre : l'a lu, le lit, l'a noté sans plus, ou veut le lire. */
export type FriendOpinionKind = 'read' | 'reading' | 'rated' | 'toRead';

/**
 * L'avis d'un lecteur suivi sur un livre précis ("Les abonnements sur la
 * fiche livre", 08/10/2026, plan Firebase) — dérivé, comme `FeedItem`, de
 * l'ÉTAT ACTUEL de son entrée de bibliothèque (pas d'un journal d'évènements).
 */
export type FriendOpinion = {
  user: FeedUser;
  entry: LibraryEntry;
  kind: FriendOpinionKind;
  at: string; // ISO — `entry.activityAt`, ou `addedAt` en repli
};
