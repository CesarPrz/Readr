import type { UserProfileRepository } from '../repositories/UserProfileRepository';

/** Garde le header du profil lisible sur une ligne, même sur un petit écran. */
export const MAX_USERNAME_LENGTH = 30;

/**
 * Change le pseudo public de l'utilisateur courant — "Profil fusionné"
 * (07/10/2026, plan Firebase). Déclenché uniquement par une édition
 * explicite (voir `ProfileHeader.tsx`), jamais automatiquement.
 *
 * Normalise (espaces superflus retirés, longueur bornée) puis écrit dans
 * Firestore via `upsertProfile` — best-effort, comme le reste de la
 * synchronisation cloud (voir sa doc) : un échec d'écriture ne doit jamais
 * empêcher l'utilisateur de voir son nouveau pseudo affiché immédiatement,
 * `authSlice.updateUsername` applique la valeur normalisée à l'état Redux de
 * façon optimiste (avant même que cet appel ne résolve), cette fonction
 * n'est donc jamais sur le chemin critique de l'affichage.
 *
 * Retourne la chaîne normalisée telle qu'effectivement enregistrée, pour que
 * l'appelant (le thunk) puisse l'appliquer à l'état si l'optimisme initial
 * utilisait la saisie brute non normalisée.
 */
export async function updateUsername(
  userProfileRepo: UserProfileRepository,
  uid: string,
  rawUsername: string,
): Promise<string> {
  const username = normalize(rawUsername);
  await userProfileRepo.upsertProfile(uid, { username });
  return username;
}

function normalize(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, MAX_USERNAME_LENGTH);
}
