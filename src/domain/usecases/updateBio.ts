import type { UserProfileRepository } from '../repositories/UserProfileRepository';

/** Même ordre de grandeur que la bio Instagram — généreux pour quelques phrases, sans devenir un pavé. */
export const MAX_BIO_LENGTH = 150;

/**
 * Change la description publique ("bio") de l'utilisateur courant — "Profil
 * façon Instagram" (08/10/2026, plan Firebase). Déclenché uniquement par une
 * édition explicite (voir `ProfileHeader.tsx`), jamais automatiquement.
 *
 * Normalise (espaces de début/fin retirés, longueur bornée) puis écrit dans
 * Firestore via `upsertProfile` — best-effort, même philosophie que
 * `updateUsername` : un échec d'écriture ne doit jamais empêcher
 * l'utilisateur de voir sa nouvelle bio affichée immédiatement
 * (`authSlice.updateBio` l'applique de façon optimiste). Contrairement à
 * `updateUsername`, les retours à la ligne internes sont conservés tels
 * quels (pas de `replace(/\s+/g, ' ')`) : une bio est un texte libre sur
 * plusieurs lignes, pas un nom affiché sur une seule ligne.
 *
 * Une bio vidée (chaîne vide après normalisation) est acceptée telle quelle
 * — `upsertProfile` écrit `bio: ''`, ce qui permet à l'utilisateur de
 * supprimer sa bio sans repasser par un état "jamais défini".
 */
export async function updateBio(userProfileRepo: UserProfileRepository, uid: string, rawBio: string): Promise<string> {
  const bio = normalize(rawBio);
  await userProfileRepo.upsertProfile(uid, { bio });
  return bio;
}

function normalize(raw: string): string {
  return raw.trim().slice(0, MAX_BIO_LENGTH);
}
