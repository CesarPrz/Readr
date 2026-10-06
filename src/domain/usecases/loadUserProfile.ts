import { generateAnonymousPseudonym } from '../../utils/anonymousPseudonym';
import type { UserProfileRepository } from '../repositories/UserProfileRepository';

/** Ce que l'écran a besoin d'afficher immédiatement après résolution — voir la doc de la fonction. */
export type LoadedUserProfile = {
  username: string;
  bio?: string;
};

/**
 * Charge le pseudo public et la bio de l'utilisateur courant depuis
 * Firestore (`users/{uid}`, voir `UserProfileRepository`) au démarrage de
 * l'app — "Profil fusionné" (07/10/2026, plan Firebase), étendu à la bio par
 * "Profil façon Instagram" (08/10/2026).
 *
 * Si ce document n'existe pas encore (l'utilisateur n'a jamais personnalisé
 * son profil) ou si Firestore est injoignable, `username` retombe sur le
 * pseudonyme généré déterministe (`generateAnonymousPseudonym`, déjà utilisé
 * avant cette fonctionnalité pour l'écran Profil) et `bio` reste `undefined`
 * (pas de repli textuel pour une bio vide — contrairement au pseudo, une bio
 * absente doit rester absente, pas remplacée par un texte générique) —
 * jamais d'écran vide pour le pseudo, jamais d'écriture déclenchée ici :
 * aucun document n'est créé tant que l'utilisateur n'édite pas explicitement
 * son profil (voir `updateUsername.ts`/`updateBio.ts`), pour ne pas écrire
 * un document Firestore pour chaque session anonyme qui ne personnalise
 * jamais rien.
 */
export async function loadUserProfile(userProfileRepo: UserProfileRepository, uid: string): Promise<LoadedUserProfile> {
  const stored = await userProfileRepo.fetchProfile(uid);
  return {
    username: stored?.username || generateAnonymousPseudonym(uid),
    bio: stored?.bio,
  };
}
