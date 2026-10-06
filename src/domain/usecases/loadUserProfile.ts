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
 * jamais d'écran vide pour le pseudo.
 *
 * **Écriture déclenchée ici depuis "Recherche d'utilisateurs" (08/10/2026,
 * plan Firebase)** — changement par rapport à l'ancien principe "jamais
 * d'écriture au chargement" : pour être TROUVABLE par la recherche
 * d'utilisateurs, un profil doit exister dans `users/{uid}` avec son champ
 * de recherche dérivé (`usernameSearch`, voir `utils/userSearch.ts`). Si le
 * document n'indique pas déjà être indexé (`searchIndexed`), on appelle donc
 * `ensureSearchable` — sans l'attendre (`void`), best-effort — ce qui crée le
 * document avec le pseudonyme généré pour un utilisateur qui n'avait rien
 * personnalisé, et ajoute simplement le champ manquant pour un pseudo déjà
 * choisi avant cette fonctionnalité (qui n'est jamais écrasé, voir la doc de
 * `ensureSearchable`). Une fois indexé, plus aucune écriture ici.
 */
export async function loadUserProfile(userProfileRepo: UserProfileRepository, uid: string): Promise<LoadedUserProfile> {
  const stored = await userProfileRepo.fetchProfile(uid);
  const username = stored?.username || generateAnonymousPseudonym(uid);
  if (!stored?.searchIndexed) void userProfileRepo.ensureSearchable(uid, username);
  return {
    username,
    bio: stored?.bio,
  };
}
