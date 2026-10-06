import type { FriendOpinion, FriendOpinionKind } from '../entities/FriendOpinion';
import type { LibraryEntry } from '../entities/LibraryEntry';
import { DEFAULT_LIST_IDS } from '../entities/ReadingList';
import type { BookOpinionsRepository } from '../repositories/BookOpinionsRepository';
import type { UserProfileRepository } from '../repositories/UserProfileRepository';
import { feedKindOf, MAX_FOLLOWED_QUERIED } from './getFriendFeed';

/**
 * Ce que l'entrée d'un lecteur dit de CE livre, ou `null` s'il n'y a rien à
 * montrer (le livre n'est chez lui que dans "Aimés" ou une liste perso).
 * Même priorité que le fil (lu > en cours > noté seul, voir `feedKindOf`),
 * plus "veut le lire" pour un livre simplement "À lire" et non noté.
 */
export function opinionKindOf(entry: LibraryEntry): FriendOpinionKind | null {
  const feedKind = feedKindOf(entry);
  if (feedKind) return feedKind;
  return entry.listIds.includes(DEFAULT_LIST_IDS.toRead) ? 'toRead' : null;
}

/**
 * Ce que les lecteurs suivis par l'utilisateur pensent d'un livre ("Les
 * abonnements sur la fiche livre", 08/10/2026, plan Firebase) : pour chacun
 * (au plus `MAX_FOLLOWED_QUERIED`), son entrée pour ce livre (retrouvée par
 * l'une de ses `workKeys`) et son profil public. Les plus récents d'abord.
 *
 * Reçoit `followingIds` déjà connus (le store les charge au démarrage) plutôt
 * que de les relire. Tolérant par lecteur, comme `getFriendFeed` : un lecteur
 * en échec est ignoré, mais si TOUS échouent la fonction lève — l'écran peut
 * alors masquer la section au lieu d'afficher un faux "personne ne l'a lu".
 */
export async function getFriendOpinions(
  opinionsRepo: BookOpinionsRepository,
  profileRepo: UserProfileRepository,
  followingIds: string[],
  workKeys: string[],
): Promise<FriendOpinion[]> {
  const queried = followingIds.slice(0, MAX_FOLLOWED_QUERIED);
  if (queried.length === 0 || workKeys.length === 0) return [];

  let failures = 0;
  const perUser = await Promise.all(
    queried.map(async (followedUid): Promise<FriendOpinion[]> => {
      try {
        const entries = await opinionsRepo.fetchEntriesByWorkKeys(followedUid, workKeys);
        const entry = entries[0];
        if (!entry) return [];
        const kind = opinionKindOf(entry);
        if (!kind) return [];

        const profile = await profileRepo.fetchProfile(followedUid);
        const user = { uid: followedUid, username: profile?.username || 'Un lecteur', photoUrl: profile?.photoUrl };
        return [{ user, entry, kind, at: entry.activityAt ?? entry.addedAt }];
      } catch {
        failures += 1;
        return [];
      }
    }),
  );

  if (failures === queried.length) throw new Error('Impossible de charger les avis de tes abonnements.');

  return perUser.flat().sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/** Note moyenne (une décimale) et nombre de notes parmi ces avis, ou `null` si aucun n'a noté le livre. */
export function summarizeFriendRatings(opinions: FriendOpinion[]): { average: number; count: number } | null {
  const ratings = opinions.map((o) => o.entry.rating).filter((r): r is number => r !== undefined);
  if (ratings.length === 0) return null;
  const average = Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10;
  return { average, count: ratings.length };
}
