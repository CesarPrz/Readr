import type { User } from 'firebase/auth';
import type { UserProfile } from '../../domain/entities/UserProfile';

/** `firebase/auth`'s `User` → `UserProfile` du domain. Même séparation raw-types/mapping que les autres sources de `data/`. */
export function toUserProfile(user: User): UserProfile {
  return {
    uid: user.uid,
    isAnonymous: user.isAnonymous,
    displayName: user.displayName ?? undefined,
    photoUrl: user.photoURL ?? undefined,
  };
}
