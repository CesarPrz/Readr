import type { LibraryRepository } from '../repositories/LibraryRepository';

export function loadLibrary(repo: LibraryRepository) {
  return repo.getAll();
}
