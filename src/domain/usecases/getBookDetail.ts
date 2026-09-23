import type { BookRepository } from '../repositories/BookRepository';

export function getBookDetail(repo: BookRepository, workId: string) {
  return repo.getDetail(workId);
}
