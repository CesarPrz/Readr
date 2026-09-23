import type { BookRepository } from '../repositories/BookRepository';

export function findBookByIsbn(repo: BookRepository, isbn: string) {
  return repo.findByIsbn(isbn);
}
