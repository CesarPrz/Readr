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

/**
 * Repli utilisé par `OpenLibraryBookRepository.getDetail` quand la fiche
 * "œuvre" Open Library existe (le livre est bien référencé, avec éditions et
 * couvertures) mais n'a simplement pas de champ `description` renseigné — cas
 * constaté en pratique sur *Les Thanatonautes* de Bernard Werber, pourtant
 * loin d'être un livre obscur. Contrairement à `findByIsbnOnGoogleBooks`, on
 * n'a pas d'ISBN à ce stade (juste le titre et les auteurs de la fiche
 * "œuvre") : recherche par titre + premier auteur (`intitle:`/`inauthor:`),
 * meilleure correspondance seulement — pas de garantie que le résultat soit
 * exactement la même édition. Même repli silencieux sans clé API configurée.
 */
export async function findDescriptionOnGoogleBooks(title: string, authors: string[]): Promise<string | undefined> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
  if (!apiKey || !title) return undefined;

  try {
    const terms = [`intitle:${encodeURIComponent(title)}`];
    if (authors[0]) terms.push(`inauthor:${encodeURIComponent(authors[0])}`);
    const url = `${GOOGLE_BOOKS_URL}?q=${terms.join('+')}&maxResults=1&key=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) return undefined;

    const data: GoogleBooksResponse = await res.json();
    return data.items?.[0]?.volumeInfo?.description;
  } catch {
    return undefined;
  }
}
