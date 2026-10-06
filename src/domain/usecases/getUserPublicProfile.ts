import type { FollowRepository } from '../repositories/FollowRepository';
import type { LibrarySyncRepository } from '../repositories/LibrarySyncRepository';
import type { ListSyncRepository } from '../repositories/ListSyncRepository';
import type { PublicUserProfile, UserProfileRepository } from '../repositories/UserProfileRepository';
import { getUserPublicLibrary, type UserPublicLibrary } from './getUserPublicLibrary';

export type UserPublicProfile = UserPublicLibrary & {
  /** `null` si le document `users/{uid}` n'existe pas ou n'a pas pu être lu — l'écran retombe alors sur ce qu'il sait déjà (résultat de recherche). */
  profile: PublicUserProfile | null;
  /** Qui suit ce lecteur / qui il suit — pour ses compteurs et l'état du bouton "Suivre" (voir `FollowRepository`). */
  followerIds: string[];
  followingIds: string[];
};

/**
 * Profil public complet d'un autre utilisateur (pseudo/photo/bio + listes +
 * livres) — "Recherche d'utilisateurs" (08/10/2026, plan Firebase). Orchestre
 * quatre ports en lecture seule, comme `linkGoogleAccount` en orchestre
 * plusieurs en écriture.
 */
export async function getUserPublicProfile(
  profileRepo: UserProfileRepository,
  listSyncRepo: ListSyncRepository,
  librarySyncRepo: LibrarySyncRepository,
  followRepo: FollowRepository,
  uid: string,
): Promise<UserPublicProfile> {
  const [profile, library, followerIds, followingIds] = await Promise.all([
    profileRepo.fetchProfile(uid),
    getUserPublicLibrary(listSyncRepo, librarySyncRepo, uid),
    followRepo.fetchFollowerIds(uid),
    followRepo.fetchFollowingIds(uid),
  ]);
  return { profile, ...library, followerIds, followingIds };
}
