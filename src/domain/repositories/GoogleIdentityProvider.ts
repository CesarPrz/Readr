/**
 * Port pour le flux natif de connexion Google (Phase 3 du plan Firebase, doc
 * Claude du projet, "firebase-social-plan"). Volontairement séparé
 * d'`AuthRepository` : ce port ne connaît que Google (obtenir un ID token),
 * jamais Firebase — c'est `AuthRepository.linkWithGoogle` qui fait le pont.
 * Implémenté par `data/google/GoogleSignInProvider.ts` via
 * `@react-native-google-signin/google-signin`, une lib native qui nécessite
 * un dev client (voir CLAUDE.md, section "Phase 3" — exception documentée à
 * la contrainte Expo Go).
 */
export interface GoogleIdentityProvider {
  /**
   * Déclenche l'écran natif de sélection de compte Google et retourne son ID
   * token OpenID Connect. Retourne `null` si l'utilisateur annule le flux
   * (fermeture de l'écran, bouton retour) — ce n'est pas une erreur.
   */
  signIn(): Promise<{ idToken: string } | null>;

  /** Vide le cache natif du SDK Google (compte mémorisé pour un signIn silencieux ultérieur) au moment de la déconnexion Firebase. */
  signOut(): Promise<void>;
}
