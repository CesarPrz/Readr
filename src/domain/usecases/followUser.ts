import type { FollowRepository } from '../repositories/FollowRepository';

/**
 * Suit un lecteur — "Fil d'amis" (08/10/2026, plan Firebase). Refuse de se
 * suivre soi-même (la règle Firestore le refuserait aussi, voir
 * `firestore.rules`, mais autant ne pas faire d'aller-retour réseau pour ça).
 * Lève en cas d'erreur : le thunk annule sa mise à jour optimiste.
 */
export async function followUser(repo: FollowRepository, uid: string, targetUid: string): Promise<void> {
  if (uid === targetUid) throw new Error('Impossible de se suivre soi-même.');
  await repo.follow(uid, targetUid);
}
