import type { LibraryEntry } from '../entities/LibraryEntry';

/**
 * Port pour retrouver, chez un lecteur donné, l'entrée de bibliothèque d'UN
 * livre précis ("Les abonnements sur la fiche livre", 08/10/2026, plan
 * Firebase). Port distinct d'`ActivityFeedRepository` (règle 5 du CLAUDE.md) :
 * le fil lit "les plus récentes entrées de quelqu'un", ici on cherche "ce
 * livre-là chez quelqu'un" — même collection Firestore, besoin différent.
 *
 * Lecture seule, sur des documents publics.
 */
export interface BookOpinionsRepository {
  /**
   * Les entrées de `uid` dont la liste `workKeys` contient l'une des clés
   * données (un même livre fusionné peut avoir été ajouté sous n'importe
   * laquelle de ses clés "œuvre" — voir `Book.workKeys`). En pratique zéro ou
   * une entrée. Lève en cas d'erreur (hors ligne, Firestore injoignable).
   */
  fetchEntriesByWorkKeys(uid: string, workKeys: string[]): Promise<LibraryEntry[]>;
}
