import type { UserProfileRepository } from '../repositories/UserProfileRepository';

/**
 * Republie la photo du compte Google courant (si connue) dans le profil
 * public `users/{uid}` — "Profil fusionné" (07/10/2026, plan Firebase).
 *
 * Pourquoi : `UserProfile.photoUrl` vient de Firebase Auth et n'est visible
 * QUE par son propre propriétaire via le SDK client (pas de moyen, côté
 * client, de lire la photo Auth d'un AUTRE utilisateur). La republier ici
 * dans le document public `users/{uid}` est ce qui la rendra visible à
 * d'autres utilisateurs plus tard (Phase "Amis", pas encore construite) —
 * même logique que "Listes de lecture publiques" : poser la donnée en
 * avance, sans attendre l'écran qui la consommera.
 *
 * Rien à faire tant qu'aucune photo Google n'est connue (utilisateur resté
 * anonyme) — pas de document créé pour ça seul (voir `loadUserProfile`, même
 * principe). Best-effort, fire-and-forget côté appelant (`authSlice`) :
 * jamais sur le chemin critique de l'affichage de SA PROPRE photo, qui vient
 * toujours directement de Firebase Auth, jamais de ce document.
 */
export async function syncProfilePhotoToCloud(
  userProfileRepo: UserProfileRepository,
  uid: string,
  photoUrl: string | undefined,
): Promise<void> {
  if (!photoUrl) return;
  await userProfileRepo.upsertProfile(uid, { photoUrl });
}
