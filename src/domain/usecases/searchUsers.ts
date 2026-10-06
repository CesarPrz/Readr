import { normalizeForUserSearch } from '../../utils/userSearch';
import type { UserSearchRepository, UserSummary } from '../repositories/UserSearchRepository';

/** En dessous, un préfixe ramène trop de monde pour être utile (et coûte une requête pour rien). */
export const MIN_USER_SEARCH_LENGTH = 2;
export const MAX_USER_SEARCH_RESULTS = 20;

/**
 * Cherche des utilisateurs par début de pseudo, sans tenir compte des
 * majuscules ni des accents — "Recherche d'utilisateurs" (08/10/2026, plan
 * Firebase). Retourne `[]` sans interroger Firestore si la saisie normalisée
 * est trop courte, et exclut l'utilisateur courant des résultats (inutile
 * de se proposer soi-même). Lève si Firestore échoue — voir
 * `UserSearchRepository` pour pourquoi ce n'est pas best-effort ici.
 */
export async function searchUsers(
  repo: UserSearchRepository,
  rawQuery: string,
  currentUid: string | undefined,
): Promise<UserSummary[]> {
  const prefix = normalizeForUserSearch(rawQuery);
  if (prefix.length < MIN_USER_SEARCH_LENGTH) return [];

  // Un résultat de plus que le maximum : le profil courant, s'il remonte, sera retiré juste après.
  const found = await repo.searchByUsernamePrefix(prefix, MAX_USER_SEARCH_RESULTS + 1);
  return found.filter((user) => user.uid !== currentUid).slice(0, MAX_USER_SEARCH_RESULTS);
}
