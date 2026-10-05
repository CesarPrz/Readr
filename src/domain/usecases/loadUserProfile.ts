import { generateAnonymousPseudonym } from '../../utils/anonymousPseudonym';
import type { UserProfileRepository } from '../repositories/UserProfileRepository';

/**
 * Charge le pseudo public de l'utilisateur courant depuis Firestore
 * (`users/{uid}`, voir `UserProfileRepository`) au démarrage de l'app —
 * "Profil fusionné" (07/10/2026, plan Firebase).
 *
 * Si ce document n'existe pas encore (l'utilisateur n'a jamais personnalisé
 * son pseudo) ou si Firestore est injoignable, retombe sur le pseudonyme
 * généré déterministe (`generateAnonymousPseudonym`, déjà utilisé avant
 * cette fonctionnalité pour l'écran Profil) — jamais d'écran vide, jamais
 * d'écriture déclenchée ici : aucun document n'est créé tant que
 * l'utilisateur n'édite pas explicitement son pseudo (voir
 * `updateUsername.ts`), pour ne pas écrire un document Firestore pour
 * chaque session anonyme qui ne personnalise jamais rien.
 */
export async function loadUserProfile(userProfileRepo: UserProfileRepository, uid: string): Promise<string> {
  const stored = await userProfileRepo.fetchProfile(uid);
  return stored?.username || generateAnonymousPseudonym(uid);
}
