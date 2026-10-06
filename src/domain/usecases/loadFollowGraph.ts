import type { FollowRepository } from '../repositories/FollowRepository';

export type FollowGraph = {
  followingIds: string[];
  followerIds: string[];
};

/** Qui je suis et qui me suit — alimente les compteurs de `ProfileHeader`, l'état du bouton "Suivre" et le fil. Lève en cas d'erreur. */
export async function loadFollowGraph(repo: FollowRepository, uid: string): Promise<FollowGraph> {
  const [followingIds, followerIds] = await Promise.all([repo.fetchFollowingIds(uid), repo.fetchFollowerIds(uid)]);
  return { followingIds, followerIds };
}
