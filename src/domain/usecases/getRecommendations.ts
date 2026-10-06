import type { Book } from '../entities/Book';
import type { LibraryEntry } from '../entities/LibraryEntry';
import { DEFAULT_LIST_IDS } from '../entities/ReadingList';
import type { RecommendationGroup } from '../entities/RecommendationGroup';
import type { ActivityFeedRepository } from '../repositories/ActivityFeedRepository';
import type { BookRepository } from '../repositories/BookRepository';
import type { BookStatsRepository } from '../repositories/BookStatsRepository';
import { matchKnownGenre, type GenreMatch } from '../../utils/genreLabels';
import { MAX_FOLLOWED_QUERIED } from './getFriendFeed';

const MAX_AUTHOR_GROUPS_PER_REASON = 2;
const MAX_COLLAB_GROUPS = 2; // limite de groupes "les lecteurs qui ont aimé/lu X ont aussi..." générés
const MAX_COLLAB_CANDIDATES = 5; // livres essayés (aimés puis lus, les plus récents d'abord) avant d'abandonner — borne le nombre de lectures Firestore
const MAX_BOOKS_PER_GROUP = 10;
const MAX_TITLES_IN_LABEL = 2;
const FRIEND_ENTRIES_PER_USER = 15; // entrées récentes lues chez chaque lecteur suivi
const FRIEND_LIKE_MIN_RATING = 4; // note à partir de laquelle un livre noté compte comme "coup de cœur"
const MAX_GENRE_CANDIDATES = 2; // livres essayés pour trouver un genre — pas toute la bibliothèque, pour borner le coût réseau

/**
 * Découvrir n'est plus une seule liste mélangée : plusieurs groupes de
 * recommandations, chacun avec sa propre justification visible plutôt qu'un
 * ensemble de suggestions sans distinction de leur origine.
 *
 * Quatre types de groupes, dans cet ordre : "Les lecteurs qui ont aimé/lu X
 * ont aussi aimé" (collaboratif, voir plus bas — le signal le plus "social",
 * placé en premier), "Car vous avez lu X (et Y)" (par auteur, livres au
 * statut "lu"), "Car vous avez aimé X (et Y)" (par auteur, livres `liked`),
 * puis au plus un "D'autres livres du genre <genre>" (genre reconnu parmi
 * une liste usuelle — Horreur, Policier, Romance, Fantasy, Biographie...,
 * voir `utils/genreLabels.ts` — à partir des sujets Open Library du livre
 * lu/aimé le plus récent). Un même livre n'est
 * jamais recommandé deux fois à travers des groupes différents (voir
 * `excludedIds`, qui démarre à la bibliothèque possédée et grossit au fur et
 * à mesure) ; un même auteur non plus pour les groupes par auteur (le
 * premier groupe qui le couvre — lu avant aimé — l'emporte).
 */
/** Lecteurs suivis par l'utilisateur, pour le groupe "coups de cœur de tes abonnements" — absent tant qu'on ne suit personne. */
export type FriendRecommendationSource = {
  activityRepo: ActivityFeedRepository;
  followingIds: string[];
};

export async function getRecommendations(
  repo: BookRepository,
  bookStatsRepo: BookStatsRepository,
  libraryEntries: LibraryEntry[],
  friends?: FriendRecommendationSource,
): Promise<RecommendationGroup[]> {
  // Grossit au fil des groupes générés : au départ seulement les livres déjà
  // possédés, puis chaque livre recommandé par un groupe rejoint l'ensemble
  // pour qu'un groupe suivant ne le reproduise pas.
  const excludedIds = new Set(libraryEntries.map((e) => e.id));
  const coveredAuthors = new Set<string>();
  const groups: RecommendationGroup[] = [];

  // Les abonnements passent en PREMIER (signal le plus personnel) et même
  // avec une bibliothèque vide : c'est justement le bon contenu pour un
  // nouveau compte qui suit déjà quelqu'un mais n'a encore rien ajouté.
  if (friends) {
    const friendGroup = await friendRecommendationGroup(friends, excludedIds);
    if (friendGroup) groups.push(friendGroup);
  }

  if (libraryEntries.length === 0) return groups;

  groups.push(...(await collaborativeRecommendationGroups(bookStatsRepo, libraryEntries, excludedIds)));

  groups.push(
    ...(await authorRecommendationGroups(
      repo,
      libraryEntries.filter((e) => e.listIds.includes(DEFAULT_LIST_IDS.read)),
      excludedIds,
      coveredAuthors,
      'lu',
    )),
  );

  groups.push(
    ...(await authorRecommendationGroups(
      repo,
      libraryEntries.filter((e) => e.listIds.includes(DEFAULT_LIST_IDS.liked)),
      excludedIds,
      coveredAuthors,
      'aimé',
    )),
  );

  const genreGroup = await genreRecommendationGroup(repo, libraryEntries, excludedIds);
  if (genreGroup) groups.push(genreGroup);

  return groups;
}

/**
 * Groupe "Les coups de cœur de tes abonnements" ("Les abonnements sur la
 * fiche livre", 08/10/2026, plan Firebase — Phase 7 "Recommandations
 * sociales", moitié "amis") : les livres que les lecteurs suivis ont AIMÉS
 * (liste "Aimés" ou note d'au moins 4) parmi leurs entrées les plus
 * récemment actives, et que tu n'as pas déjà. Classés par nombre de lecteurs
 * suivis qui l'ont aimé, puis par note moyenne, puis par récence.
 *
 * Best-effort : un lecteur dont la lecture échoue est ignoré, et si rien
 * n'est utilisable (ou tout échoue) il n'y a simplement pas de groupe —
 * Découvrir ne doit jamais casser à cause du réseau social.
 */
async function friendRecommendationGroup(
  friends: FriendRecommendationSource,
  excludedIds: Set<string>,
): Promise<RecommendationGroup | null> {
  const queried = friends.followingIds.slice(0, MAX_FOLLOWED_QUERIED);
  if (queried.length === 0) return null;

  const perFriend = await Promise.all(
    queried.map((uid) => friends.activityRepo.fetchRecentEntries(uid, FRIEND_ENTRIES_PER_USER).catch(() => [] as LibraryEntry[])),
  );

  const byBook = new Map<string, { entry: LibraryEntry; likers: number; ratings: number[]; latest: string }>();
  for (const entries of perFriend) {
    for (const entry of entries) {
      const liked =
        entry.listIds.includes(DEFAULT_LIST_IDS.liked) ||
        (entry.rating !== undefined && entry.rating >= FRIEND_LIKE_MIN_RATING);
      if (!liked || excludedIds.has(entry.id)) continue;

      const at = entry.activityAt ?? entry.addedAt;
      const known = byBook.get(entry.id);
      if (known) {
        known.likers += 1;
        if (entry.rating !== undefined) known.ratings.push(entry.rating);
        if (at > known.latest) known.latest = at;
      } else {
        byBook.set(entry.id, { entry, likers: 1, ratings: entry.rating !== undefined ? [entry.rating] : [], latest: at });
      }
    }
  }
  if (byBook.size === 0) return null;

  const average = (ratings: number[]) => (ratings.length === 0 ? 0 : ratings.reduce((a, b) => a + b, 0) / ratings.length);
  const ranked = [...byBook.values()]
    .sort(
      (a, b) =>
        b.likers - a.likers ||
        average(b.ratings) - average(a.ratings) ||
        new Date(b.latest).getTime() - new Date(a.latest).getTime(),
    )
    .slice(0, MAX_BOOKS_PER_GROUP);

  ranked.forEach(({ entry }) => excludedIds.add(entry.id));
  return {
    id: 'friends-liked',
    title: 'Les coups de cœur de tes abonnements',
    books: ranked.map(({ entry }): Book => ({
      id: entry.id,
      workKeys: entry.workKeys,
      title: entry.title,
      authors: entry.authors,
      coverId: entry.coverId,
      coverUrl: entry.coverUrl,
      description: entry.description,
      languages: entry.languages,
    })),
  };
}

/**
 * Groupe "collaboratif" : pour quelques-uns de tes livres aimés/lus (les plus
 * récents d'abord, aimés avant lus — signal le plus fort), lit les
 * statistiques communautaires précalculées (`BookStatsRepository`, voir sa
 * doc) et propose ce que d'autres lecteurs ayant aimé/lu ce même livre ont
 * eux aussi aimé/lu. Contrairement aux groupes par auteur/genre (calculés à
 * la volée depuis Open Library), ces statistiques sont pré-calculées côté
 * serveur par une Cloud Function planifiée — voir le plan Firebase, doc
 * Claude du projet, section "Recommandations collaboratives". Pas de groupe
 * pour un livre sans statistiques (jamais recalculé, ou jamais co-aimé/co-lu
 * par personne) — même philosophie que les autres groupes : jamais de groupe
 * vide ou approximatif.
 */
async function collaborativeRecommendationGroups(
  bookStatsRepo: BookStatsRepository,
  libraryEntries: LibraryEntry[],
  excludedIds: Set<string>,
): Promise<RecommendationGroup[]> {
  const liked = libraryEntries.filter((e) => e.listIds.includes(DEFAULT_LIST_IDS.liked));
  const read = libraryEntries.filter((e) => e.listIds.includes(DEFAULT_LIST_IDS.read));
  const byRecency = (entries: LibraryEntry[]) =>
    [...entries].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());

  // Aimés d'abord (signal le plus fort), puis lus — sans doublon si un livre
  // est à la fois aimé et lu (listIds n'est pas exclusif pour "aimés", voir
  // ReadingList.ts).
  const likedIds = new Set(liked.map((e) => e.id));
  const candidates = [...byRecency(liked), ...byRecency(read).filter((e) => !likedIds.has(e.id))].slice(
    0,
    MAX_COLLAB_CANDIDATES,
  );

  const groups: RecommendationGroup[] = [];

  for (const entry of candidates) {
    if (groups.length >= MAX_COLLAB_GROUPS) break;

    const related = await bookStatsRepo.getRelatedBooks(entry.id);
    const filtered = related.filter((book) => !excludedIds.has(book.id));
    if (filtered.length === 0) continue; // rien de neuf pour ce livre — pas de groupe vide

    filtered.forEach((book) => excludedIds.add(book.id));
    const verb = entry.listIds.includes(DEFAULT_LIST_IDS.liked) ? 'aimé' : 'lu';
    groups.push({
      id: `collab:${entry.id}`,
      title: `Les lecteurs qui ont ${verb} ${entry.title} ont aussi aimé`,
      books: filtered.slice(0, MAX_BOOKS_PER_GROUP),
    });
  }

  return groups;
}

/** Groupe les entrées (lues ou aimées) par premier auteur — le plus récent en premier — et cherche d'autres livres de cet auteur. */
async function authorRecommendationGroups(
  repo: BookRepository,
  entries: LibraryEntry[],
  excludedIds: Set<string>,
  coveredAuthors: Set<string>,
  reason: 'lu' | 'aimé',
): Promise<RecommendationGroup[]> {
  const byAuthor = groupByPrimaryAuthorByRecency(entries);
  const groups: RecommendationGroup[] = [];

  for (const { author, entries: authorEntries } of byAuthor) {
    if (groups.length >= MAX_AUTHOR_GROUPS_PER_REASON) break;
    if (coveredAuthors.has(author)) continue; // déjà couvert par un groupe "lu" — pas la peine de le répéter pour "aimé"

    const books = await searchExcluding(repo, author, excludedIds);
    if (books.length === 0) continue; // pas de nouvelle recommandation pour cet auteur — pas de groupe vide

    coveredAuthors.add(author);
    books.forEach((book) => excludedIds.add(book.id));
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

async function searchExcluding(repo: BookRepository, query: string, excludedIds: Set<string>): Promise<Book[]> {
  try {
    const { books } = await repo.search(query, 1);
    return books.filter((book) => !excludedIds.has(book.id));
  } catch {
    return []; // une recherche qui échoue ne doit pas casser tout Découvrir, juste sauter ce groupe
  }
}

/**
 * Utilise les sujets Open Library (`BookDetail.subjects`) du livre lu ou aimé
 * le plus récent pour proposer "d'autres livres" du même genre — un genre
 * reconnu parmi une liste usuelle (Horreur, Policier, Romance, Fantasy,
 * Biographie...), pas un sujet Open Library brut.
 *
 * **Changement du 07/10/2026, demande explicite du porteur du projet** :
 * l'ancien comportement prenait `subjects[0]` tel quel comme libellé de
 * genre (les sujets Open Library forment une liste libre, mélange de
 * genres/thèmes/lieux/prix littéraires, pas une taxonomie de genres propre)
 * — ça a fini par afficher littéralement "D'autres classiques du genre
 * 'Holes'" (le titre d'un autre roman, catalogué comme sujet par Open
 * Library sur un des livres de la bibliothèque, pas un genre du tout).
 * `matchKnownGenre` (voir `utils/genreLabels.ts`) compare désormais CHAQUE
 * sujet du livre à une liste fermée de genres usuels, et retient le premier
 * qui correspond. Pas de groupe généré si aucun sujet ne correspond à un
 * genre connu — mieux vaut l'absence de row qu'un libellé qui n'a jamais été
 * un genre.
 */
async function genreRecommendationGroup(
  repo: BookRepository,
  libraryEntries: LibraryEntry[],
  excludedIds: Set<string>,
): Promise<RecommendationGroup | undefined> {
  const candidates = [...libraryEntries]
    .filter((e) => e.listIds.includes(DEFAULT_LIST_IDS.read) || e.listIds.includes(DEFAULT_LIST_IDS.liked))
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    .slice(0, MAX_GENRE_CANDIDATES);

  for (const entry of candidates) {
    const match = await findGenreMatch(repo, entry.workKeys);
    if (!match) continue;

    // La requête Open Library utilise le sujet brut qui a servi à la
    // correspondance (ex. "Detective and mystery stories"), jamais le
    // libellé français affiché (ex. "Policier") — Open Library n'indexe pas
    // ses sujets en français, une recherche sur le libellé traduit ne
    // renverrait rien.
    const books = await searchExcluding(repo, `subject:"${match.openLibrarySubject}"`, excludedIds);
    if (books.length === 0) continue;

    return {
      id: `genre:${match.label}`,
      title: `D'autres livres du genre "${match.label}"`,
      books: books.slice(0, MAX_BOOKS_PER_GROUP),
    };
  }

  return undefined;
}

async function findGenreMatch(repo: BookRepository, workKeys: string[]): Promise<GenreMatch | undefined> {
  try {
    const detail = await repo.getDetail(workKeys);
    return matchKnownGenre(detail.subjects);
  } catch {
    return undefined;
  }
}
