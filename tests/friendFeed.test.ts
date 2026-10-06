import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_LIST_IDS } from '../src/domain/entities/ReadingList';
import type { LibraryEntry } from '../src/domain/entities/LibraryEntry';
import type { ActivityFeedRepository } from '../src/domain/repositories/ActivityFeedRepository';
import type { FollowRepository } from '../src/domain/repositories/FollowRepository';
import { feedKindOf, getFriendFeed, MAX_FEED_ITEMS, MAX_FOLLOWED_QUERIED } from '../src/domain/usecases/getFriendFeed';
import { makeEntry } from './helpers';

describe('feedKindOf', () => {
  it('lu > en cours > noté seul', () => {
    assert.equal(feedKindOf(makeEntry({ listIds: [DEFAULT_LIST_IDS.read], rating: 5 })), 'read');
    assert.equal(feedKindOf(makeEntry({ listIds: [DEFAULT_LIST_IDS.reading], rating: 5 })), 'reading');
    assert.equal(feedKindOf(makeEntry({ listIds: [DEFAULT_LIST_IDS.toRead], rating: 5 })), 'rated');
  });

  it('ignore « à lire » sans note, les likes et les listes perso', () => {
    assert.equal(feedKindOf(makeEntry({ listIds: [DEFAULT_LIST_IDS.toRead] })), null);
    assert.equal(feedKindOf(makeEntry({ listIds: [DEFAULT_LIST_IDS.liked] })), null);
    assert.equal(feedKindOf(makeEntry({ listIds: ['custom-1'] })), null);
  });

  it('une note de 0 reste une note (rating défini)', () => {
    assert.equal(feedKindOf(makeEntry({ listIds: [], rating: 0 })), 'rated');
  });
});

type Profiles = Record<string, { username: string; photoUrl?: string } | null | 'throw'>;

function setup(opts: {
  following: string[];
  entries: Record<string, LibraryEntry[] | 'throw'>;
  profiles?: Profiles;
}) {
  const followRepo = { fetchFollowingIds: async () => opts.following } as unknown as FollowRepository;
  const profileRepo = {
    fetchProfile: async (uid: string) => {
      const p = opts.profiles?.[uid];
      if (p === 'throw') throw new Error('boom');
      return p === undefined ? { username: `user-${uid}` } : p;
    },
  } as any;
  const activityRepo: ActivityFeedRepository = {
    fetchRecentEntries: async (uid) => {
      const e = opts.entries[uid];
      if (e === 'throw') throw new Error('offline');
      return e ?? [];
    },
  };
  return { followRepo, profileRepo, activityRepo };
}

const read = (id: string, activityAt: string) =>
  makeEntry({ id, listIds: [DEFAULT_LIST_IDS.read], addedAt: '2020-01-01T00:00:00.000Z', activityAt });

describe('getFriendFeed', () => {
  it("renvoie [] sans interroger personne quand on ne suit personne", async () => {
    const { followRepo, profileRepo, activityRepo } = setup({ following: [], entries: {} });
    assert.deepEqual(await getFriendFeed(followRepo, profileRepo, activityRepo, 'me'), []);
  });

  it('fusionne les lecteurs, du plus récent au plus ancien, avec leur pseudo', async () => {
    const { followRepo, profileRepo, activityRepo } = setup({
      following: ['a', 'b'],
      entries: {
        a: [read('b1', '2026-03-01T00:00:00.000Z'), read('b2', '2026-01-01T00:00:00.000Z')],
        b: [read('b3', '2026-02-01T00:00:00.000Z')],
      },
    });
    const feed = await getFriendFeed(followRepo, profileRepo, activityRepo, 'me');
    assert.deepEqual(feed.map((i) => i.id), ['a:b1', 'b:b3', 'a:b2']);
    assert.equal(feed[0].user.username, 'user-a');
    assert.equal(feed[0].kind, 'read');
  });

  it("filtre les entrées sans intérêt et retombe sur addedAt sans activityAt", async () => {
    const legacy = makeEntry({ id: 'old', listIds: [DEFAULT_LIST_IDS.read], addedAt: '2025-05-05T00:00:00.000Z' });
    const boring = makeEntry({ id: 'boring', listIds: [DEFAULT_LIST_IDS.toRead] });
    const { followRepo, profileRepo, activityRepo } = setup({ following: ['a'], entries: { a: [boring, legacy] } });
    const feed = await getFriendFeed(followRepo, profileRepo, activityRepo, 'me');
    assert.equal(feed.length, 1);
    assert.equal(feed[0].at, '2025-05-05T00:00:00.000Z');
  });

  it('un profil introuvable donne « Un lecteur » au lieu de casser', async () => {
    const { followRepo, profileRepo, activityRepo } = setup({
      following: ['a'],
      profiles: { a: null },
      entries: { a: [read('x', '2026-01-01T00:00:00.000Z')] },
    });
    const feed = await getFriendFeed(followRepo, profileRepo, activityRepo, 'me');
    assert.equal(feed[0].user.username, 'Un lecteur');
  });

  it('ignore un lecteur en échec mais garde les autres', async () => {
    const { followRepo, profileRepo, activityRepo } = setup({
      following: ['a', 'b'],
      entries: { a: 'throw', b: [read('x', '2026-01-01T00:00:00.000Z')] },
    });
    const feed = await getFriendFeed(followRepo, profileRepo, activityRepo, 'me');
    assert.deepEqual(feed.map((i) => i.id), ['b:x']);
  });

  it('lève si TOUS les lecteurs échouent (hors ligne), pour proposer de réessayer', async () => {
    const { followRepo, profileRepo, activityRepo } = setup({ following: ['a', 'b'], entries: { a: 'throw', b: 'throw' } });
    await assert.rejects(getFriendFeed(followRepo, profileRepo, activityRepo, 'me'));
  });

  it(`n'interroge que ${MAX_FOLLOWED_QUERIED} lecteurs et n'affiche que ${MAX_FEED_ITEMS} lignes`, async () => {
    const following = Array.from({ length: MAX_FOLLOWED_QUERIED + 10 }, (_, i) => `u${i}`);
    const queried: string[] = [];
    const followRepo = { fetchFollowingIds: async () => following } as unknown as FollowRepository;
    const profileRepo = { fetchProfile: async () => ({ username: 'x' }) } as any;
    const activityRepo: ActivityFeedRepository = {
      fetchRecentEntries: async (uid) => {
        queried.push(uid);
        return Array.from({ length: 5 }, (_, i) => read(`${uid}-${i}`, `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`));
      },
    };
    const feed = await getFriendFeed(followRepo, profileRepo, activityRepo, 'me');
    assert.equal(queried.length, MAX_FOLLOWED_QUERIED);
    assert.equal(feed.length, MAX_FEED_ITEMS);
  });
});
