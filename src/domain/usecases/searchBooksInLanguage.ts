import type { BookRepository, SearchBooksResult } from '../repositories/BookRepository';

/**
 * Relance la recherche existante en restreignant les résultats à une langue
 * donnée — utilisé par l'écran "tous les livres de <langue>" ouvert depuis le
 * regroupement par langue des résultats de recherche. Compose simplement le
 * filtre `language:<code>` dans la requête envoyée à `BookRepository.search`,
 * qui applique ensuite le même pipeline (pagination, regroupement des
 * doublons) que la recherche normale — aucun changement d'interface du
 * domain nécessaire.
 */
export function searchBooksInLanguage(
  repo: BookRepository,
  query: string,
  language: string,
  page: number,
): Promise<SearchBooksResult> {
  return repo.search(`${query} language:${language}`, page);
}
