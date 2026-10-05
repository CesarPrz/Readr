import type { UserProfile } from '../entities/UserProfile';

/**
 * Port pour la session utilisateur (implémenté par `data/firebase/` — le
 * domain ne sait pas que c'est Firebase). Phase 1 du plan Firebase (doc
 * Claude du projet, "firebase-social-plan") : connexion anonyme silencieuse.
 * Phase 3 : liaison d'un compte Google à cette session anonyme et
 * déconnexion, comme de nouvelles méthodes sur ce même port — pas un
 * changement des précédentes.
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

  /**
   * Lie le compte Google (via son ID token OpenID Connect) à la session
   * anonyme courante — l'utilisateur garde le même `uid`, donc sa
   * bibliothèque cloud existante (Phase 2) reste associée. Ne fait rien côté
   * Google lui-même : voir `GoogleIdentityProvider` pour obtenir ce token.
   *
   * Si ce compte Google est déjà lié à un AUTRE utilisateur Firebase (ex.
   * l'app a été réinstallée, ou le compte est déjà utilisé sur un autre
   * appareil), la session courante **bascule automatiquement vers ce compte
   * existant** (`switchedToExistingAccount: true` dans le résultat) plutôt
   * que d'échouer — revirement par rapport à la décision initiale de "juste
   * informer l'utilisateur" (voir le plan Firebase, doc Claude du projet,
   * "firebase-social-plan", section "Bascule vers un compte existant") :
   * Google a déjà vérifié l'identité de la personne pour nous, inutile de la
   * laisser bloquée sur un compte anonyme. L'appelant (voir le usecase
   * `linkGoogleAccount`) est alors responsable de restaurer la
   * bibliothèque/les listes de ce compte existant depuis Firestore — la
   * session anonyme abandonnée n'a plus de raison d'être affichée une fois
   * l'identité changée.
   */
  linkWithGoogle(idToken: string): Promise<LinkGoogleOutcome>;

  /**
   * Déconnecte l'utilisateur courant. Ne touche jamais à la bibliothèque
   * locale (AsyncStorage) : elle reste consultable hors-ligne. Au prochain
   * démarrage, `ensureSignedIn()` recréera une session anonyme vierge.
   */
  signOutCurrentUser(): Promise<void>;
}

/** Résultat de `AuthRepository.linkWithGoogle` — voir sa doc pour `switchedToExistingAccount`. */
export type LinkGoogleOutcome = {
  profile: UserProfile;
  switchedToExistingAccount: boolean;
};
