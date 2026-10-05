import type { ReadingList } from '../entities/ReadingList';
import type { ListRepository } from '../repositories/ListRepository';
import { generateId } from '../../utils/generateId';

/** Crée une liste perso — jamais une des 4 par défaut, toujours `isDefault: false`/`exclusive: false` (voir ReadingList.ts). Ignore les noms vides. */
export async function createReadingList(
  repo: ListRepository,
  currentLists: ReadingList[],
  name: string,
): Promise<ReadingList[]> {
  const trimmed = name.trim();
  if (!trimmed) return currentLists;

  const list: ReadingList = {
    id: generateId(),
    name: trimmed,
    isDefault: false,
    exclusive: false,
    createdAt: new Date().toISOString(),
  };
  const next = [...currentLists, list];
  await repo.saveAll(next);
  return next;
}
