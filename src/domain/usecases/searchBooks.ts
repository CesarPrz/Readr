import type { BookRepository } from '../repositories/BookRepository';

export function searchBooks(repo: BookRepository, query: string, page: number) {
  return repo.search(query, page);
}
