/**
 * Normalisation d'un pseudo pour la recherche d'utilisateurs ("Recherche
 * d'utilisateurs", 08/10/2026 — voir le plan Firebase, doc Claude du
 * projet) : minuscules, sans accents, espaces multiples réduits à un seul.
 *
 * Utilisée des DEUX côtés de la recherche, pour qu'ils restent forcément
 * d'accord : à l'écriture (`FirestoreUserProfileRepository` stocke
 * `usernameSearch` = cette forme normalisée du pseudo, à côté du pseudo tel
 * que saisi) et à la lecture (`searchUsers` normalise la saisie avant de la
 * comparer par préfixe à ce champ). Firestore ne sait pas faire de
 * recherche insensible à la casse/aux accents de lui-même — d'où ce champ
 * dérivé dédié plutôt qu'une requête directe sur `username`.
 */
export function normalizeForUserSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}
