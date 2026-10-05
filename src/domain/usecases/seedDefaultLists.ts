import { DEFAULT_LIST_IDS, type ReadingList } from '../entities/ReadingList';
import type { ListRepository } from '../repositories/ListRepository';

/**
 * Crée les 4 listes par défaut ("À lire", "En cours", "Lu", "Aimés") — appelé
 * au démarrage de l'app (voir App.tsx), au même titre que
 * `fetchLibrary`/`ensureSignedIn`. Idempotent : si des listes existent déjà
 * localement, ne fait rien et les retourne telles quelles. "Créées à la
 * création du compte" au sens produit, mais implémenté comme "s'il n'y en a
 * encore aucune localement" pour rester robuste aux comptes déjà existants
 * avant l'ajout de cette fonctionnalité (migration douce, sans écran dédié
 * ni dépendance à un vrai événement Firebase de création de compte).
 */
export async function seedDefaultLists(repo: ListRepository): Promise<ReadingList[]> {
  const existing = await repo.getAll();
  if (existing.length > 0) return existing;

  const now = new Date().toISOString();
  const defaults: ReadingList[] = [
    { id: DEFAULT_LIST_IDS.toRead, name: 'À lire', isDefault: true, exclusive: true, createdAt: now },
    { id: DEFAULT_LIST_IDS.reading, name: 'En cours', isDefault: true, exclusive: true, createdAt: now },
    { id: DEFAULT_LIST_IDS.read, name: 'Lu', isDefault: true, exclusive: true, createdAt: now },
    { id: DEFAULT_LIST_IDS.liked, name: 'Aimés', isDefault: true, exclusive: false, createdAt: now },
  ];
  await repo.saveAll(defaults);
  return defaults;
}
