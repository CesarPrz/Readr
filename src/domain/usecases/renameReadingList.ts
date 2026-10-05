import type { ReadingList } from '../entities/ReadingList';
import type { ListRepository } from '../repositories/ListRepository';

/** Renomme une liste perso — no-op sur une liste par défaut (voir ReadingList.isDefault), volontairement fixes. */
export async function renameReadingList(
  repo: ListRepository,
  currentLists: ReadingList[],
  listId: string,
  name: string,
): Promise<ReadingList[]> {
  const trimmed = name.trim();
  const target = currentLists.find((l) => l.id === listId);
  if (!trimmed || !target || target.isDefault) return currentLists;

  const next = currentLists.map((l) => (l.id === listId ? { ...l, name: trimmed } : l));
  await repo.saveAll(next);
  return next;
}
