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
   * Lève `CredentialAlreadyInUseError` si ce compte Google est déjà lié à un
   * AUTRE utilisateur Firebase (ex. l'app a été réinstallée, ou le compte est
   * déjà utilisé sur un autre appareil) — la fusion des bibliothèques n'est
   * pas encore prise en charge (voir doc Claude du projet,
   * "firebase-social-plan"), l'appelant doit juste en informer l'utilisateur.
   */
  linkWithGoogle(idToken: string): Promise<UserProfile>;

  /**
   * Déconnecte l'utilisateur courant. Ne touche jamais à la bibliothèque
   * locale (AsyncStorage) : elle reste consultable hors-ligne. Au prochain
   * démarrage, `ensureSignedIn()` recréera une session anonyme vierge.
   */
  signOutCurrentUser(): Promise<void>;
}

/**
 * Voir `AuthRepository.linkWithGoogle`. Type dédié (plutôt que de laisser
 * fuiter l'erreur Firebase brute `auth/credential-already-in-use`) pour que
 * le domain et l'UI puissent réagir à ce cas précis sans rien savoir de
 * Firebase.
 */
export class CredentialAlreadyInUseError extends Error {
  constructor() {
    super('Ce compte Google est déjà utilisé par un autre profil Readr.');
    this.name = 'CredentialAlreadyInUseError';
  }
}
