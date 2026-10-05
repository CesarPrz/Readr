/**
 * Port pour le profil PUBLIC de l'utilisateur (07/10/2026, "Profil fusionné"
 * — voir le plan Firebase, doc Claude du projet) : le pseudo (`username`,
 * modifiable à tout moment, même resté anonyme) et la photo (`photoUrl`,
 * miroir de celle du compte Google une fois lié — jamais d'upload perso,
 * voir `UserProfile.ts`). Stocké dans `users/{uid}`, un document public en
 * lecture (comme `library`/`lists`), écriture réservée au propriétaire —
 * voir `firestore.rules`.
 *
 * Document distinct de `AuthRepository` : celui-ci reste la session Firebase
 * Auth elle-même (`UserProfile.uid`/`isAnonymous`/`displayName`/`photoUrl`
 * Google) ; celui-là est la donnée PUBLIQUE complémentaire que Firebase Auth
 * ne sait pas stocker (un pseudo n'a pas d'équivalent natif côté Auth,
 * contrairement à `displayName`/`photoURL`). Même séparation de
 * responsabilité que `LibrarySyncRepository`/`ListSyncRepository` vis-à-vis
 * de `LibraryRepository`/`ListRepository`.
 *
 * Posé en prévision de la Phase 4 ("Amis", pas encore construite) : une
 * future consultation du profil d'un AUTRE utilisateur lira ce même document
 * (`fetchProfile(uid)` avec un `uid` qui n'est pas forcément le sien) — rien
 * de plus à construire côté données pour ça le moment venu, seulement
 * l'écran de découverte qui reste entièrement à faire.
 */
export interface UserProfileRepository {
  /**
   * Lit le profil public d'un utilisateur (le sien, ou — Phase 4 — celui
   * d'un autre). `null` si ce document n'existe pas encore (utilisateur qui
   * n'a jamais personnalisé son pseudo) ou si Firestore est injoignable —
   * best-effort, jamais d'exception, voir l'implémentation.
   */
  fetchProfile(uid: string): Promise<PublicUserProfile | null>;

  /**
   * Fusionne (jamais de remplacement total) les champs fournis dans le
   * profil public de l'utilisateur COURANT. N'écrit jamais le profil d'un
   * autre uid — `firestore.rules` le refuserait de toute façon
   * (`request.auth.uid == uid`). Best-effort, comme le reste de la
   * synchronisation cloud (`syncLibraryEntry` et consorts) : une erreur ne
   * doit jamais bloquer l'utilisateur sur une action aussi anodine que
   * changer son pseudo.
   */
  upsertProfile(uid: string, patch: Partial<PublicUserProfile>): Promise<void>;
}

/** Forme exacte du document `users/{uid}` — voir la doc du port ci-dessus. */
export type PublicUserProfile = {
  username: string;
  photoUrl?: string;
};
