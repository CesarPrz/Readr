import type { Book } from '../../domain/entities/Book';
import { googleVolumeToBook } from './mappers';
import type { GoogleBooksResponse } from './types';

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';

/**
 * Dernier recours de `findByIsbn` (voir `OpenLibraryBookRepository`), utilisé
 * uniquement quand l'ISBN scanné est absent d'Open Library en entier. Le
 * catalogue d'Open Library est orienté fonds de bibliothèques et couvre mal
 * certaines éditions commerciales grand public (poche français, entre
 * autres) ; Google Books, orienté vente, les couvre beaucoup mieux.
 *
 * Pas de clé API nécessaire pour une simple recherche par ISBN, mais le quota
 * anonyme est limité (429 possible en cas d'usage intensif) — d'où son rôle
 * de dernier repli, jamais de source principale. Un échec ici (réseau, quota,
 * réponse inattendue) ne doit jamais faire planter le scan : on renvoie
 * `undefined`, l'écran affiche alors « aucun livre trouvé ».
 */
export async function findByIsbnOnGoogleBooks(isbn: string): Promise<Book | undefined> {
  try {
    const res = await fetch(`${GOOGLE_BOOKS_URL}?q=isbn:${isbn}`);
    if (!res.ok) return undefined;
    const data: GoogleBooksResponse = await res.json();
    const volume = data.items?.[0];
    if (!volume) return undefined;
    return googleVolumeToBook(isbn, volume);
  } catch {
    return undefined;
  }
}
