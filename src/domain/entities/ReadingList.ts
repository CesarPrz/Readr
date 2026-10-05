/**
 * Une liste de lecture — généralise ce qui était avant un statut figé
 * (`ReadingStatus`) et un booléen "aimé" indépendant sur `LibraryEntry`. Les
 * 4 listes historiques ("À lire", "En cours", "Lu", "Aimés") sont désormais
 * des `ReadingList` ordinaires, créées automatiquement à la création du
 * compte (voir `seedDefaultLists`) — l'utilisateur peut en créer d'autres,
 * personnalisées, au même titre (voir `createReadingList`). Rien ne les
 * distingue techniquement des listes perso à part `isDefault` (non
 * supprimables/renommables, voir `renameReadingList`/`deleteReadingList`) et,
 * pour trois d'entre elles, `exclusive`.
 *
 * Stockage : local (AsyncStorage, `ListRepository`) pour l'accès hors-ligne,
 * et cloud (Firestore, `ListSyncRepository`, `users/{uid}/lists/{listId}`)
 * en LECTURE PUBLIQUE — n'importe quel utilisateur connecté peut voir les
 * listes de n'importe qui (décision produit, voir le plan Firebase, doc
 * Claude du projet, section "Listes de lecture publiques"). Parcourir les
 * listes d'un AUTRE utilisateur n'est volontairement pas encore construit
 * côté UI — ce sera la Phase 4 ("Amis"/découverte), pas encore conçue ; ce
 * qui existe ici pose seulement la donnée en lecture publique.
 */
export type ReadingList = {
  id: string;
  name: string;
  /** Une des 4 listes créées à la création du compte — non supprimable, non renommable. */
  isDefault: boolean;
  /**
   * "À lire"/"En cours"/"Lu" restent mutuellement exclusives comme avant ce
   * refactor : ajouter un livre à l'une l'enlève automatiquement des deux
   * autres listes `exclusive` (voir `toggleBookList`). "Aimés" et toutes les
   * listes perso ont `exclusive: false` — un livre peut y figurer en plus de
   * n'importe quel statut de lecture, sans limite de cumul.
   */
  exclusive: boolean;
  createdAt: string;
};

/**
 * Ids stables des 4 listes par défaut — identiques en local et dans
 * Firestore, pour qu'une liste par défaut reste reconnaissable partout sans
 * dépendre de son nom.
 */
export const DEFAULT_LIST_IDS = {
  toRead: 'default-to-read',
  reading: 'default-reading',
  read: 'default-read',
  liked: 'default-liked',
} as const;

/** Les 3 listes de statut, mutuellement exclusives entre elles — voir StatusSegmented et la migration dans AsyncStorageLibraryRepository. */
export const EXCLUSIVE_STATUS_LIST_IDS: string[] = [
  DEFAULT_LIST_IDS.toRead,
  DEFAULT_LIST_IDS.reading,
  DEFAULT_LIST_IDS.read,
];
