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

  /**
   * Rend le profil de l'utilisateur COURANT trouvable par la recherche
   * d'utilisateurs ("Recherche d'utilisateurs", 08/10/2026) : s'assure que
   * `users/{uid}` existe avec un pseudo ET son champ de recherche dérivé
   * (voir `utils/userSearch.ts`). Si un pseudo est déjà stocké, il n'est
   * JAMAIS écrasé — seul le champ de recherche manquant est ajouté ;
   * `defaultUsername` (le pseudonyme généré affiché par défaut) n'est
   * écrit que si aucun pseudo n'existe encore côté serveur. Volontairement
   * une opération du port plutôt qu'un `upsertProfile` : `fetchProfile`
   * renvoie `null` aussi bien pour "document absent" que pour "Firestore
   * injoignable", et un `upsertProfile` fait sur ce `null` risquerait
   * d'écraser un vrai pseudo personnalisé lors d'une simple coupure réseau.
   * Best-effort, jamais d'exception.
   */
  ensureSearchable(uid: string, defaultUsername: string): Promise<void>;
}

/** Forme exacte du document `users/{uid}` — voir la doc du port ci-dessus. */
export type PublicUserProfile = {
  username: string;
  photoUrl?: string;
  /**
   * Description libre façon Instagram (08/10/2026, "Profil façon Instagram"
   * — voir le plan Firebase) : même mécanique que `username` (éditable à
   * tout moment, même resté anonyme, voir `updateBio.ts`), mais conserve les
   * retours à la ligne saisis (contrairement au pseudo, qui reste sur une
   * seule ligne) — borné à `MAX_BIO_LENGTH` plutôt qu'à `MAX_USERNAME_LENGTH`.
   */
  bio?: string;
  /**
   * LECTURE SEULE, dérivé : `true` quand le champ de recherche stocké à côté
   * du pseudo (`usernameSearch`, voir `utils/userSearch.ts`) existe et
   * correspond bien au pseudo courant. Jamais écrit via `upsertProfile`
   * (ignoré dans un `patch`) — ce dernier le recalcule lui-même à chaque
   * écriture du pseudo. Sert uniquement à `loadUserProfile` pour savoir s'il
   * faut appeler `ensureSearchable`.
   */
  searchIndexed?: boolean;
};
