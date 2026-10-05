import type { ReadingList } from '../entities/ReadingList';

/**
 * Port pour la synchronisation cloud des listes de lecture — pendant de
 * `LibrarySyncRepository` (voir sa doc pour le contrat best-effort à sens
 * unique de `upsertList`/`removeList`, et pour `fetchAll`, lue dans les deux
 * mêmes cas d'usage : restauration lors d'une bascule de compte, et
 * rafraîchissement régulier via `refreshListsFromServer`). Différence
 * notable : ces listes sont en LECTURE PUBLIQUE côté règles Firestore (voir
 * firestore.rules) — n'importe quel utilisateur connecté peut lire
 * `users/{uid}/lists/**`, l'écriture reste réservée au propriétaire.
 */
export interface ListSyncRepository {
  /** Écrit ou remplace la liste sous `users/{uid}/lists/{listId}`. */
  upsertList(uid: string, list: ReadingList): Promise<void>;
  /** Supprime la liste côté cloud (no-op silencieux si elle n'existait pas). */
  removeList(uid: string, listId: string): Promise<void>;
  /** Lit l'intégralité des listes cloud d'un utilisateur — voir `LibrarySyncRepository.fetchAll` pour les deux cas d'usage. */
  fetchAll(uid: string): Promise<ReadingList[]>;
}
