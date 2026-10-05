import type { ReadingList } from '../entities/ReadingList';

/** Port for the local reading-lists store — même forme que LibraryRepository (voir sa doc). */
export interface ListRepository {
  getAll(): Promise<ReadingList[]>;
  saveAll(lists: ReadingList[]): Promise<void>;
}
