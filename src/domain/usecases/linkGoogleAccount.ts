import type { UserProfile } from '../entities/UserProfile';
import type { AuthRepository } from '../repositories/AuthRepository';
import type { GoogleIdentityProvider } from '../repositories/GoogleIdentityProvider';

/**
 * Lie le compte Google de l'utilisateur à sa session anonyme existante
 * (Phase 3 du plan Firebase, doc Claude du projet, "firebase-social-plan").
 * Déclenché uniquement depuis l'écran Profil, à l'initiative explicite de
 * l'utilisateur — jamais automatiquement, voir le principe UX de connexion
 * non intrusive. Retourne `null` si l'utilisateur annule le flux Google
 * (pas une erreur) ; peut lever `CredentialAlreadyInUseError`, voir
 * `AuthRepository.linkWithGoogle`.
 */
export async function linkGoogleAccount(
  googleProvider: GoogleIdentityProvider,
  authRepo: AuthRepository,
): Promise<UserProfile | null> {
  const result = await googleProvider.signIn();
  if (!result) return null;
  return authRepo.linkWithGoogle(result.idToken);
}
