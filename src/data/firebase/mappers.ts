import type { User } from 'firebase/auth';
import { serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '../../domain/entities/UserProfile';
import type { LibraryEntry } from '../../domain/entities/LibraryEntry';

/** `firebase/auth`'s `User` → `UserProfile` du domain. Même séparation raw-types/mapping que les autres sources de `data/`. */
export function toUserProfile(user: User): UserProfile {
  return {
    uid: user.uid,
    isAnonymous: user.isAnonymous,
    displayName: user.displayName ?? undefined,
    photoUrl: user.photoURL ?? undefined,
  };
}

/**
 * `LibraryEntry` du domain → document Firestore public
 * (`users/{uid}/library/{bookId}`, voir le plan Firebase, doc Claude du
 * projet). Volontairement partiel : ni `note` (carnet personnel, reste
 * local), ni `description`/`languages`/`workKeys`/`addedAt` ne sont
 * synchronisés — seul le minimum documenté dans le plan (statut, note,
 * aimé, de quoi afficher le livre). Extensible plus tard si une phase future
 * (restauration, flux d'amis) a besoin de plus.
 *
 * `?? null` partout où le champ est optionnel : Firestore refuse `undefined`
 * comme valeur de champ (l'écriture échouerait), contrairement à un objet JS
 * ordinaire.
 */
export function toFirestoreLibraryEntry(entry: LibraryEntry) {
  return {
    title: entry.title,
    authors: entry.authors,
    coverId: entry.coverId ?? null,
    coverUrl: entry.coverUrl ?? null,
    status: entry.status,
    liked: entry.liked ?? false,
    rating: entry.rating ?? null,
    updatedAt: serverTimestamp(),
  };
}
