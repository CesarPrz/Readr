import type { Book } from '../../domain/entities/Book';
import { bnfRecordToBook } from './mappers';
import { parseBnfDublinCore } from './xml';

const BNF_SRU_URL = 'https://catalogue.bnf.fr/api/SRU';

/**
 * Dernier recours de `findByIsbn` (voir `OpenLibraryBookRepository`), utilisé
 * uniquement quand l'ISBN scanné est absent d'Open Library en entier (index
 * de recherche ET catalogue brut). Interroge directement le catalogue de la
 * Bibliothèque nationale de France par ISBN — gratuit, sans clé API, et
 * nettement plus complet qu'Open Library pour les éditions françaises grand
 * public (poche, notamment), là où Open Library (catalogue orienté fonds
 * anglophones) échoue souvent.
 *
 * Remplace un premier essai avec l'API Google Books : sans clé, son quota
 * anonyme s'est révélé trop bas pour être fiable (429 systématique en test),
 * alors que la BnF n'a pas ce problème et couvre justement mieux le cas
 * qu'on cherchait à corriger (éditions françaises).
 *
 * Un échec ici (réseau, réponse inattendue) ne doit jamais faire planter le
 * scan : on renvoie `undefined`, l'écran affiche alors « aucun livre trouvé ».
 */
export async function findByIsbnOnBnf(isbn: string): Promise<Book | undefined> {
  try {
    const query = `bib.isbn all "${isbn}"`;
    const url = `${BNF_SRU_URL}?version=1.2&operation=searchRetrieve&query=${encodeURIComponent(query)}&recordSchema=dublincore&maximumRecords=1`;
    const res = await fetch(url);
    if (!res.ok) return undefined;

    const xml = await res.text();
    const record = parseBnfDublinCore(xml);
    if (!record) return undefined;

    return bnfRecordToBook(isbn, record);
  } catch {
    return undefined;
  }
}
