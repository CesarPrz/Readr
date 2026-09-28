import type { LibrarySyncRepository } from '../repositories/LibrarySyncRepository';

/** Symétrique de `syncLibraryEntry` pour une suppression — même contrat best-effort, voir sa doc. */
export async function removeLibraryEntryFromCloud(
  repo: LibrarySyncRepository,
  uid: string | undefined,
  bookId: string,
): Promise<void> {
  if (!uid) return;
  try {
    await repo.removeEntry(uid, bookId);
  } catch {
    // Échec silencieux volontaire — voir syncLibraryEntry.
  }
}
