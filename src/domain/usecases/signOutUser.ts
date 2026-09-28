import type { AuthRepository } from '../repositories/AuthRepository';
import type { GoogleIdentityProvider } from '../repositories/GoogleIdentityProvider';

/**
 * Déconnecte l'utilisateur (Phase 3 du plan Firebase). Ne touche jamais à la
 * bibliothèque locale (AsyncStorage), qui reste consultable hors-ligne. Au
 * prochain démarrage, `ensureSignedIn` recréera une session anonyme vierge —
 * voir le principe UX de connexion non intrusive.
 */
export async function signOutUser(googleProvider: GoogleIdentityProvider, authRepo: AuthRepository): Promise<void> {
  await googleProvider.signOut();
  await authRepo.signOutCurrentUser();
}
