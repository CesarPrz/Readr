/**
 * Identité minimale de l'utilisateur courant côté authentification.
 * `isAnonymous` distingue un utilisateur qui n'a pas encore lié Google (voir
 * la Phase 3 du plan Firebase) — sert à savoir s'il faut lui proposer de le
 * faire ou masquer les fonctionnalités sociales pour lui.
 */
export type UserProfile = {
  uid: string;
  isAnonymous: boolean;
  displayName?: string;
  photoUrl?: string;
};
