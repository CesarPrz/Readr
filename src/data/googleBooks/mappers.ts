import type { Book } from '../../domain/entities/Book';
import type { GoogleBooksVolume } from './types';

/**
 * Construit un `Book` à partir d'un volume Google Books — dernier repli de
 * `findByIsbn` quand le livre n'existe carrément pas chez Open Library (ni
 * dans son index de recherche, ni dans son catalogue brut). Google Books n'a
 * pas de notion d'« œuvre » comme Open Library : on fabrique un identifiant
 * stable à partir de l'ISBN pour que le livre reste identifiable dans la
 * bibliothèque, mais `BookRepository.getDetail` ne pourra rien enrichir pour
 * ce livre (pas d'éditions/langues Open Library associées) — dégradation
 * silencieuse, sans planter la fiche détail.
 *
 * Pas de couverture : les URLs d'image Google Books ne suivent pas le même
 * format que `covers.openlibrary.org/b/id/<id>-<size>.jpg`, sur lequel
 * `BookRepository.coverUrl` (et donc tout le reste de l'appli) est bâti.
 * Le livre s'affiche avec le badge titre en placeholder, comme n'importe
 * quel livre sans couverture référencée chez Open Library.
 */
export function googleVolumeToBook(isbn: string, volume: GoogleBooksVolume): Book | undefined {
  const info = volume.volumeInfo;
  if (!info?.title) return undefined;

  const id = `google:${isbn}`;
  return {
    id,
    workKeys: [id],
    title: info.title,
    authors: info.authors ?? [],
    languages: info.language ? [info.language] : [],
  };
}
