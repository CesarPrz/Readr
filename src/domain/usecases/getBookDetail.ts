import type { BookRepository } from '../repositories/BookRepository';

export function getBookDetail(repo: BookRepository, workIds: string[]) {
  return repo.getDetail(workIds);
}
