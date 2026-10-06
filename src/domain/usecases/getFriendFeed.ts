import { DEFAULT_LIST_IDS } from '../entities/ReadingList';
import type { LibraryEntry } from '../entities/LibraryEntry';
import type { FeedItem, FeedItemKind } from '../entities/FeedItem';
import type { ActivityFeedRepository } from '../repositories/ActivityFeedRepository';
import type { FollowRepository } from '../repositories/FollowRepository';
import type { UserProfileRepository } from '../repositories/UserProfileRepository';

/** Plafonds assumés à l'échelle de ce projet : au plus 30 lecteurs suivis interrogés, 15 entrées récentes chacun, 60 lignes affichées. */
export const MAX_FOLLOWED_QUERIED = 30;
const RECENT_ENTRIES_PER_USER = 15;
export const MAX_FEED_ITEMS = 60;

/**
 * Ce qu'une entrée de bibliothèque raconte, ou `null` si elle n'a rien à
 * faire dans le fil. Choix produit tranché avec le porteur du projet :
 * livres LUS, NOTÉS, ou EN COURS de lecture (pas les simples "à lire", ni
 * les likes, ni les listes perso). Priorité : lu > en cours > noté seul.
 */
export function feedKindOf(entry: LibraryEntry): FeedItemKind | null {
  if (entry.listIds.includes(DEFAULT_LIST_IDS.read)) return 'read';
  if (entry.listIds.includes(DEFAULT_LIST_IDS.reading)) return 'reading';
  if (entry.rating !== undefined) return 'rated';
  return null;
}

/**
 * Construit le fil d'activité des lecteurs suivis par `uid` — "Fil d'amis"
 * (08/10/2026, plan Firebase), fan-out à la lecture : pour chaque lecteur
 * suivi, son profil public et ses entrées les plus récemment actives sont
 * lus à la volée, filtrés par `feedKindOf`, puis fusionnés et triés du plus
 * récent au plus ancien. Orchestre trois ports en lecture seule.
 *
 * Tolérant par lecteur : un lecteur dont la lecture échoue est simplement
 * ignoré (un seul compte cassé ne doit pas vider tout le fil). Mais si TOUS
 * échouent — typiquement hors ligne — la fonction lève, pour que l'écran
 * puisse proposer de réessayer au lieu de montrer un faux "rien de neuf".
 */
export async function getFriendFeed(
  followRepo: FollowRepository,
  profileRepo: UserProfileRepository,
  activityRepo: ActivityFeedRepository,
  uid: string,
): Promise<FeedItem[]> {
  const followingIds = (await followRepo.fetchFollowingIds(uid)).slice(0, MAX_FOLLOWED_QUERIED);
  if (followingIds.length === 0) return [];

  let failures = 0;
  const perUser = await Promise.all(
    followingIds.map(async (followedUid): Promise<FeedItem[]> => {
      try {
        const [profile, entries] = await Promise.all([
          profileRepo.fetchProfile(followedUid),
          activityRepo.fetchRecentEntries(followedUid, RECENT_ENTRIES_PER_USER),
        ]);
        const user = { uid: followedUid, username: profile?.username || 'Un lecteur', photoUrl: profile?.photoUrl };

        return entries.flatMap((entry) => {
          const kind = feedKindOf(entry);
          if (!kind) return [];
          return [{ id: `${followedUid}:${entry.id}`, user, entry, kind, at: entry.activityAt ?? entry.addedAt }];
        });
      } catch {
        failures += 1;
        return [];
      }
    }),
  );

  if (failures === followingIds.length) throw new Error('Impossible de charger le fil.');

  return perUser
    .flat()
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, MAX_FEED_ITEMS);
}
