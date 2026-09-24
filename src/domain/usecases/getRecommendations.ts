import type { Book } from '../entities/Book';
import type { LibraryEntry } from '../entities/LibraryEntry';
import type { RecommendationGroup } from '../entities/RecommendationGroup';
import type { BookRepository } from '../repositories/BookRepository';

const MAX_AUTHOR_GROUPS_PER_REASON = 2;
const MAX_BOOKS_PER_GROUP = 10;
const MAX_TITLES_IN_LABEL = 2;
const MAX_GENRE_CANDIDATES = 2; // livres essayés pour trouver un genre — pas toute la bibliothèque, pour borner le coût réseau

/**
 * Découvrir n'est plus une seule liste mélangée : plusieurs groupes de
 * recommandations, chacun avec sa propre justification visible plutôt qu'un
 * ensemble de suggestions sans distinction de leur origine.
 *
 * Trois types de groupes, dans cet ordre : "Car vous avez lu X (et Y)" (par
 * auteur, livres au statut "lu"), "Car vous avez aimé X (et Y)" (par auteur,
 * livres `liked`), puis au plus un "D'autres classiques du genre <sujet>"
 * (basé sur les sujets Open Library du livre lu/aimé le plus récent). Un même
 * auteur n'est jamais recommandé deux fois pour deux raisons différentes — le
 * premier groupe qui le couvre (lu avant aimé) l'emporte.
 */
export async function getRecommendations(
  repo: BookRepository,
  libraryEntries: LibraryEntry[],
): Promise<RecommendationGroup[]> {
  if (libraryEntries.length === 0) return [];

  const ownedIds = new Set(libraryEntries.map((e) => e.id));
  const coveredAuthors = new Set<string>();
  const groups: RecommendationGroup[] = [];

  groups.push(
    ...(await authorRecommendationGroups(
      repo,
      libraryEntries.filter((e) => e.status === 'read'),
      ownedIds,
      coveredAuthors,
      'lu',
    )),
  );

  groups.push(
    ...(await authorRecommendationGroups(
      repo,
      libraryEntries.filter((e) => e.liked),
      ownedIds,
      coveredAuthors,
      'aimé',
    )),
  );

  const genreGroup = await genreRecommendationGroup(repo, libraryEntries, ownedIds);
  if (genreGroup) groups.push(genreGroup);

  return groups;
}

/** Groupe les entrées (lues ou aimées) par premier auteur — le plus récent en premier — et cherche d'autres livres de cet auteur. */
async function authorRecommendationGroups(
  repo: BookRepository,
  entries: LibraryEntry[],
  ownedIds: Set<string>,
  coveredAuthors: Set<string>,
  reason: 'lu' | 'aimé',
): Promise<RecommendationGroup[]> {
  const byAuthor = groupByPrimaryAuthorByRecency(entries);
  const groups: RecommendationGroup[] = [];

  for (const { author, entries: authorEntries } of byAuthor) {
    if (groups.length >= MAX_AUTHOR_GROUPS_PER_REASON) break;
    if (coveredAuthors.has(author)) continue; // déjà couvert par un groupe "lu" — pas la peine de le répéter pour "aimé"

    const books = await searchExcluding(repo, author, ownedIds);
    if (books.length === 0) continue; // pas de nouvelle recommandation pour cet auteur — pas de groupe vide

    coveredAuthors.add(author);
    const titles = authorEntries.slice(0, MAX_TITLES_IN_LABEL).map((e) => e.title);
    groups.push({
      id: `${reason}:${author}`,
      title: `Car vous avez ${reason} ${joinTitles(titles)}`,
      books: books.slice(0, MAX_BOOKS_PER_GROUP),
    });
  }

  return groups;
}

/** "X" / "X et Y" — jamais plus de deux titres, pour garder le titre de la row lisible. */
function joinTitles(titles: string[]): string {
  if (titles.length <= 1) return titles[0] ?? '';
  return `${titles.slice(0, -1).join(', ')} et ${titles[titles.length - 1]}`;
}

function groupByPrimaryAuthorByRecency(entries: LibraryEntry[]): { author: string; entries: LibraryEntry[] }[] {
  const byRecency = [...entries].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  const order: string[] = [];
  const byAuthor = new Map<string, LibraryEntry[]>();

  for (const entry of byRecency) {
    const author = entry.authors[0];
    if (!author) continue; // livre sans auteur connu — rien à recommander à partir de lui
    if (!byAuthor.has(author)) {
      byAuthor.set(author, []);
      order.push(author);
    }
    byAuthor.get(author)!.push(entry);
  }

  return order.map((author) => ({ author, entries: byAuthor.get(author)! }));
}

async function searchExcluding(repo: BookRepository, query: string, ownedIds: Set<string>): Promise<Book[]> {
  try {
    const { books } = await repo.search(query, 1);
    return books.filter((book) => !ownedIds.has(book.id));
  } catch {
    return []; // une recherche qui échoue ne doit pas casser tout Découvrir, juste sauter ce groupe
  }
}

/**
 * Utilise les sujets Open Library (`BookDetail.subjects`) du livre lu ou aimé
 * le plus récent pour proposer "d'autres classiques" du même genre.
 * Heuristique faible : `subjects[0]` est pris tel quel comme libellé de genre
 * — les sujets Open Library forment une liste libre (mélange de genres,
 * thèmes, prix littéraires...), pas une taxonomie de genres propre, et
 * souvent en anglais même pour un livre francophone. Pas de groupe généré si
 * aucun sujet exploitable n'est trouvé, plutôt qu'un genre approximatif.
 */
async function genreRecommendationGroup(
  repo: BookRepository,
  libraryEntries: LibraryEntry[],
  ownedIds: Set<string>,
): Promise<RecommendationGroup | undefined> {
  const candidates = [...libraryEntries]
    .filter((e) => e.status === 'read' || e.liked)
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    .slice(0, MAX_GENRE_CANDIDATES);

  for (const entry of candidates) {
    const genre = await primaryGenre(repo, entry.workKeys);
    if (!genre) continue;

    const books = await searchExcluding(repo, `subject:"${genre}"`, ownedIds);
    if (books.length === 0) continue;

    return {
      id: `genre:${genre}`,
      title: `D'autres classiques du genre "${genre}"`,
      books: books.slice(0, MAX_BOOKS_PER_GROUP),
    };
  }

  return undefined;
}

async function primaryGenre(repo: BookRepository, workKeys: string[]): Promise<string | undefined> {
  try {
    const detail = await repo.getDetail(workKeys);
    return detail.subjects[0];
  } catch {
    return undefined;
  }
}
