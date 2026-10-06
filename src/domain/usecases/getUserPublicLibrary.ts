import { DEFAULT_LIST_IDS, type ReadingList } from '../entities/ReadingList';
import type { LibraryEntry } from '../entities/LibraryEntry';
import type { LibrarySyncRepository } from '../repositories/LibrarySyncRepository';
import type { ListSyncRepository } from '../repositories/ListSyncRepository';

export type UserPublicLibrary = {
  lists: ReadingList[]; // listes par défaut d'abord (ordre fixe), puis listes perso par date de création
  entries: LibraryEntry[]; // toute la bibliothèque publique — à filtrer par `listIds` côté écran
};

const DEFAULT_ORDER = [DEFAULT_LIST_IDS.toRead, DEFAULT_LIST_IDS.reading, DEFAULT_LIST_IDS.read, DEFAULT_LIST_IDS.liked];

/**
 * Lit les listes de lecture et la bibliothèque d'un AUTRE utilisateur —
 * "Recherche d'utilisateurs" (08/10/2026, plan Firebase). Rien de nouveau
 * côté donnée : `fetchAll(uid)` existe déjà (bascule de compte, serveur qui
 * fait foi) et ces collections sont en lecture publique depuis "Listes de
 * lecture publiques". Ne touche JAMAIS la copie locale (`saveAll`) : c'est
 * la bibliothèque de quelqu'un d'autre, pas la nôtre. Lève si Firestore
 * échoue, pour que l'écran puisse proposer de réessayer.
 */
export async function getUserPublicLibrary(
  listSyncRepo: ListSyncRepository,
  librarySyncRepo: LibrarySyncRepository,
  uid: string,
): Promise<UserPublicLibrary> {
  const [lists, entries] = await Promise.all([listSyncRepo.fetchAll(uid), librarySyncRepo.fetchAll(uid)]);

  const defaults = DEFAULT_ORDER.map((id) => lists.find((l) => l.id === id)).filter((l): l is ReadingList => !!l);
  const customs = lists.filter((l) => !l.isDefault).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { lists: [...defaults, ...customs], entries };
}
