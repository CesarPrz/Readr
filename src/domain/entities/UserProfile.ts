/**
 * Identité de l'utilisateur courant. `isAnonymous` distingue un utilisateur
 * qui n'a pas encore lié Google (voir la Phase 3 du plan Firebase) — sert à
 * savoir s'il faut lui proposer de le faire ou masquer les fonctionnalités
 * sociales pour lui.
 *
 * `displayName`/`photoUrl` viennent exclusivement du compte Google une fois
 * lié (Phase 3, `toUserProfile` dans `data/firebase/mappers.ts`) — jamais
 * modifiables depuis l'app, jamais de photo perso uploadée (voir
 * "Profil fusionné" dans le plan Firebase pour pourquoi).
 *
 * `username` (07/10/2026, "Profil fusionné") est un pseudo public et
 * modifiable à tout moment par l'utilisateur, MÊME resté anonyme —
 * indépendant du vrai nom Google, stocké à part dans Firestore
 * (`users/{uid}`, voir `UserProfileRepository`/`loadUserProfile`). Optionnel
 * au niveau du type seulement parce que `ensureSignedIn`/`toUserProfile`
 * (Firebase Auth) ne le connaissent pas : un écran qui l'affiche retombe sur
 * `generateAnonymousPseudonym(user.uid)` (même valeur que le repli appliqué
 * côté `loadUserProfile`) pour la brève fenêtre avant que ce dernier ne
 * résolve.
 *
 * `bio` (08/10/2026, "Profil façon Instagram") suit exactement la même
 * mécanique que `username` — public, éditable à tout moment même resté
 * anonyme, stockée dans le même document `users/{uid}` — mais n'a PAS de
 * repli généré quand elle est absente : contrairement au pseudo, un profil
 * sans bio affiche simplement un espace vide (ou une invite à en écrire une,
 * côté `ProfileHeader`), jamais de texte de substitution.
 */
export type UserProfile = {
  uid: string;
  isAnonymous: boolean;
  displayName?: string;
  photoUrl?: string;
  username?: string;
  bio?: string;
};
