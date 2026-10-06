import type { LibraryEntry } from '../entities/LibraryEntry';

/**
 * Port de lecture de l'activité RÉCENTE de la bibliothèque d'un utilisateur,
 * pour le "Fil d'amis" (08/10/2026, plan Firebase) — "fan-out à la lecture"
 * comme recommandé dans le plan : le fil interroge chaque lecteur suivi à la
 * volée, rien n'est dupliqué à l'écriture.
 *
 * Distinct de `LibrarySyncRepository.fetchAll` (règle 5) : celui-ci lit
 * TOUTE la bibliothèque, sans ordre, pour restaurer/rafraîchir la sienne ;
 * ici on veut seulement les N dernières entrées d'AUTRUI, triées par
 * `activityAt` côté serveur.
 */
export interface ActivityFeedRepository {
  /** Les `max` entrées les plus récemment actives de `uid`, la plus récente d'abord. Lève en cas d'erreur. */
  fetchRecentEntries(uid: string, max: number): Promise<LibraryEntry[]>;
}
