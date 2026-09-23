import type { LibraryEntry } from '../entities/LibraryEntry';

/** Port for the local personal library store. */
export interface LibraryRepository {
  getAll(): Promise<LibraryEntry[]>;
  saveAll(entries: LibraryEntry[]): Promise<void>;
}
