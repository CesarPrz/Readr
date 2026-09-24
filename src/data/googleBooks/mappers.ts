import type { Book } from '../../domain/entities/Book';
import type { GoogleBooksVolume } from './types';

/**
 * Construit un `Book` à partir d'un volume Google Books. Google Books n'a pas
 * de notion d'« œuvre » comme Open Library : on fabrique un identifiant
 * stable à partir de l'ISBN pour que le livre reste identifiable dans la
 * bibliothèque, mais `BookRepository.getDetail` ne pourra rien enrichir pour
 * ce livre (pas d'éditions/langues Open Library associées) — dégradation
 * silencieuse, sans planter la fiche détail.
 *
 * Contrairement au premier essai (avant la clé API), on récupère ici aussi la
 * couverture : `Book.coverUrl` porte une URL déjà résolue, puisque le format
 * des images Google Books ne suit pas le schéma numérique `coverId` d'Open
 * Library (`covers.openlibrary.org/b/id/<id>-<size>.jpg`).
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
    coverUrl: googleCoverUrl(volume),
    languages: info.language ? [info.language] : [],
  };
}

/** Google Books renvoie ses URLs de couverture en http:// — bloqué par défaut (contenu mixte) sur iOS/Android. */
function googleCoverUrl(volume: GoogleBooksVolume): string | undefined {
  const raw = volume.volumeInfo?.imageLinks?.thumbnail ?? volume.volumeInfo?.imageLinks?.smallThumbnail;
  return raw?.replace(/^http:/, 'https:');
}
