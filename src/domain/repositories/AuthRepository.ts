import type { UserProfile } from '../entities/UserProfile';

/**
 * Port pour la session utilisateur (implémenté par `data/firebase/` — le
 * domain ne sait pas que c'est Firebase). Phase 1 du plan Firebase (doc
 * Claude du projet, "firebase-social-plan") : connexion anonyme silencieuse
 * uniquement. `linkGoogleAccount`/`signOut` arriveront en Phase 3 comme de
 * nouvelles méthodes sur ce même port, pas comme un changement de celles-ci.
 */
export interface AuthRepository {
  /**
   * Retourne l'utilisateur courant, en créant une session anonyme s'il n'en
   * existe pas encore. Ne montre jamais d'interface ni ne bloque sur une
   * saisie — voir le principe UX de connexion non intrusive.
   */
  ensureSignedIn(): Promise<UserProfile>;

  /** Utilisateur courant si déjà connu localement, sans appel réseau. `null` avant la résolution de `ensureSignedIn()`. */
  getCurrentUser(): UserProfile | null;
}
