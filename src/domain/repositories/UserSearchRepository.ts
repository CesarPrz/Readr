/**
 * Port pour la RECHERCHE d'utilisateurs par pseudo ("Recherche
 * d'utilisateurs", 08/10/2026 — voir le plan Firebase, doc Claude du
 * projet) : première brique de la Phase "Amis" côté écran.
 *
 * Port distinct de `UserProfileRepository` (règle 5 du CLAUDE.md) : lire UN
 * profil dont on connaît l'`uid` et CHERCHER parmi tous les profils sont
 * deux besoins métier différents, qui ne justifient pas d'alourdir le port
 * existant — même séparation que `LibrarySyncRepository`/`BookStatsRepository`.
 *
 * Lecture seule : cherche dans les documents publics `users/{uid}` (lecture
 * publique, voir `firestore.rules`) sans jamais rien écrire.
 */
export interface UserSearchRepository {
  /**
   * Utilisateurs dont le pseudo NORMALISÉ (voir `utils/userSearch.ts`)
   * commence par `normalizedPrefix`, au plus `max` résultats. `normalizedPrefix`
   * doit déjà être normalisé par l'appelant (`searchUsers`). Contrairement
   * aux écritures du reste de la synchronisation cloud, cette lecture LÈVE
   * en cas d'erreur (hors ligne, Firestore injoignable) : l'écran doit
   * pouvoir distinguer "aucun résultat" de "la recherche a échoué".
   */
  searchByUsernamePrefix(normalizedPrefix: string, max: number): Promise<UserSummary[]>;
}

/** Ce qu'une ligne de résultat de recherche affiche — sous-ensemble de `PublicUserProfile` plus l'`uid`. */
export type UserSummary = {
  uid: string;
  username: string;
  photoUrl?: string;
  bio?: string;
};
