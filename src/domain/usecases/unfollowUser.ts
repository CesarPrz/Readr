import type { FollowRepository } from '../repositories/FollowRepository';

/** Cesse de suivre un lecteur — pendant de `followUser`. Lève en cas d'erreur : le thunk annule sa mise à jour optimiste. */
export async function unfollowUser(repo: FollowRepository, uid: string, targetUid: string): Promise<void> {
  await repo.unfollow(uid, targetUid);
}
