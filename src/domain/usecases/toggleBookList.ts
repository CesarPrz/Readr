import type { LibraryEntry } from '../entities/LibraryEntry';
import type { ReadingList } from '../entities/ReadingList';
import type { LibraryRepository } from '../repositories/LibraryRepository';

/**
 * Ajoute ou retire un livre d'une liste. Si la liste est `exclusive` (À
 * lire/En cours/Lu, voir ReadingList.ts) et qu'on l'ajoute, le livre est
 * automatiquement retiré des deux autres listes exclusives — un livre ne
 * peut être que dans une seule des trois à la fois, comme avant ce refactor
 * (décision produit, voir le plan Firebase, section "Listes de lecture
 * publiques"). Aucune autre liste (Aimés, listes perso) n'a cette règle.
 */
export async function toggleBookList(
  repo: LibraryRepository,
  currentEntries: LibraryEntry[],
  allLists: ReadingList[],
  bookId: string,
  listId: string,
  add: boolean,
): Promise<LibraryEntry[]> {
  const targetList = allLists.find((l) => l.id === listId);
  const exclusiveIds = new Set(allLists.filter((l) => l.exclusive).map((l) => l.id));

  const next = currentEntries.map((entry) => {
    if (entry.id !== bookId) return entry;
    let listIds = entry.listIds.filter((id) => id !== listId);
    if (add) {
      if (targetList?.exclusive) listIds = listIds.filter((id) => !exclusiveIds.has(id));
      listIds = [...listIds, listId];
    }
    // Changement de statut de lecture (liste exclusive ajoutée) = activité
    // visible dans le fil des abonnés — voir `LibraryEntry.activityAt`. Retirer
    // une liste, aimer ou ajouter à une liste perso n'en est pas une.
    const activityAt = add && targetList?.exclusive ? new Date().toISOString() : entry.activityAt;
    return { ...entry, listIds, activityAt };
  });
  await repo.saveAll(next);
  return next;
}
