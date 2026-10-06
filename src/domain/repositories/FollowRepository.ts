/**
 * Port pour le graphe d'ABONNEMENTS ("Fil d'amis", 08/10/2026 — voir le plan
 * Firebase, doc Claude du projet) : qui je suis, qui me suit. Modèle
 * "façon Instagram/Letterboxd" tranché avec le porteur du projet : on suit
 * quelqu'un sans qu'il ait à accepter (pas de demande ni de réciprocité) —
 * c'est ce qui rend réels les compteurs Abonnés/Abonnements de
 * `ProfileHeader`, jusque-là purement visuels.
 *
 * Stocké en DEUX documents par abonnement (`users/{uid}/following/{target}`
 * côté abonné, `users/{target}/followers/{uid}` côté suivi), écrits
 * ensemble : Firestore ne sait pas compter/lister "qui me suit" sans cet
 * index inverse. Les deux sous-collections sont en lecture publique, comme
 * le reste du profil ; chacun n'écrit que ce qui le concerne (voir
 * `firestore.rules`).
 */
export interface FollowRepository {
  /** `uid` se met à suivre `targetUid`. Idempotent. Lève en cas d'erreur — l'appelant (thunk) annule sa mise à jour optimiste. */
  follow(uid: string, targetUid: string): Promise<void>;
  /** `uid` cesse de suivre `targetUid`. Idempotent. Lève en cas d'erreur. */
  unfollow(uid: string, targetUid: string): Promise<void>;
  /** Ids des utilisateurs que `uid` suit. */
  fetchFollowingIds(uid: string): Promise<string[]>;
  /** Ids des utilisateurs qui suivent `uid`. */
  fetchFollowerIds(uid: string): Promise<string[]>;
}
