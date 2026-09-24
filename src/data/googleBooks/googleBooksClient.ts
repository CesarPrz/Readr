import type { Book } from '../../domain/entities/Book';
import { googleVolumeToBook } from './mappers';
import type { GoogleBooksResponse } from './types';

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';

/**
 * Repli de `findByIsbn` (voir `OpenLibraryBookRepository`), utilisé quand
 * l'ISBN scanné n'est pas dans l'index de recherche Open Library ni dans son
 * catalogue brut. Nécessite une clé API : `EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY`
 * (voir `.env.example` et le README pour la configurer) — sans clé, l'API
 * Google Books rejette même les recherches en lecture seule (quota anonyme
 * quasi inexistant, 429 systématique constaté en test).
 *
 * Si la clé n'est pas configurée, ce repli est silencieusement sauté (pas
 * d'erreur bruyante) — `findByIsbn` continue avec le repli BnF.
 */
export async function findByIsbnOnGoogleBooks(isbn: string): Promise<Book | undefined> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
  if (!apiKey) return undefined;

  try {
    const url = `${GOOGLE_BOOKS_URL}?q=isbn:${isbn}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return undefined;

    const data: GoogleBooksResponse = await res.json();
    const volume = data.items?.[0];
    if (!volume) return undefined;

    return googleVolumeToBook(isbn, volume);
  } catch {
    return undefined;
  }
}
