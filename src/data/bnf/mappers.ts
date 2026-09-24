import type { Book } from '../../domain/entities/Book';
import type { BnfRecord } from './types';

/**
 * Le titre BnF embarque souvent la mention de responsabilité après un
 * " / " (ex. "Dracula : traduction intégrale / Bram Stoker ; traduit de
 * l'anglais par Jacques Sirgent") — on ne garde que la partie avant.
 */
function cleanTitle(rawTitle: string): string {
  return rawTitle.split(' / ')[0].trim();
}

/** "Stoker, Bram (1847-1912). Auteur du texte" → "Bram Stoker" */
function creatorToName(raw: string): string {
  const withoutRole = raw.split('. ')[0]; // coupe avant le rôle final ("Auteur du texte", "Traducteur"...)
  const [last, rest] = withoutRole.split(',').map((part) => part.trim());
  if (!rest) return last;
  const first = rest.split('(')[0].trim(); // coupe les dates de naissance/mort entre parenthèses
  return [first, last].filter(Boolean).join(' ');
}

/**
 * Construit un `Book` à partir d'une fiche BnF — repli de `findByIsbn` pour
 * les éditions absentes d'Open Library. Comme pour le repli Google Books
 * qu'elle remplace, pas d'identifiant "œuvre" Open Library à associer :
 * `BookRepository.getDetail` ne pourra rien enrichir pour ce livre (pas
 * d'éditions/langues supplémentaires), et il s'affichera sans couverture —
 * la BnF n'expose pas d'image de couverture par cette API.
 */
export function bnfRecordToBook(isbn: string, record: BnfRecord): Book | undefined {
  if (!record.title) return undefined;

  const id = `bnf:${isbn}`;
  return {
    id,
    workKeys: [id],
    title: cleanTitle(record.title),
    authors: record.creators.map(creatorToName).filter(Boolean),
    languages: record.language ? [record.language] : [],
  };
}
