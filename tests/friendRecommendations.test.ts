import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_LIST_IDS } from '../src/domain/entities/ReadingList';
import type { LibraryEntry } from '../src/domain/entities/LibraryEntry';
import type { ActivityFeedRepository } from '../src/domain/repositories/ActivityFeedRepository';
import { getRecommendations } from '../src/domain/usecases/getRecommendations';
import { makeEntry } from './helpers';

// Le groupe "abonnements" ne doit toucher ni le catalogue ni les statistiques communautaires.
const forbiddenRepo = new Proxy({}, { get: () => () => { throw new Error('ne devrait pas être appelé'); } }) as any;

function activity(byUser: Record<string, LibraryEntry[] | 'throw'>): ActivityFeedRepository {
  return {
    fetchRecentEntries: async (uid) => {
      const e = byUser[uid];
      if (e === 'throw') throw new Error('offline');
      return e ?? [];
    },
  };
}

const liked = (id: string, over: Partial<LibraryEntry> = {}) =>
  makeEntry({ id, workKeys: [id], title: id, listIds: [DEFAULT_LIST_IDS.liked], ...over });

describe('groupe « coups de cœur de tes abonnements »', () => {
  it('apparaît même avec une bibliothèque vide, seul et sans autre appel', async () => {
    const groups = await getRecommendations(forbiddenRepo, forbiddenRepo, [], {
      activityRepo: activity({ a: [liked('/works/A')] }),
      followingIds: ['a'],
    });
    assert.equal(groups.length, 1);
    assert.equal(groups[0].id, 'friends-liked');
    assert.deepEqual(groups[0].books.map((b) => b.id), ['/works/A']);
  });

  it("retient les likes et les notes >= 4, jamais les simples « lu » mal notés", async () => {
    const groups = await getRecommendations(forbiddenRepo, forbiddenRepo, [], {
      activityRepo: activity({
        a: [
          liked('/works/LIKED'),
          makeEntry({ id: '/works/GOOD', workKeys: ['/works/GOOD'], listIds: [DEFAULT_LIST_IDS.read], rating: 4 }),
          makeEntry({ id: '/works/MEH', workKeys: ['/works/MEH'], listIds: [DEFAULT_LIST_IDS.read], rating: 2 }),
          makeEntry({ id: '/works/PLAIN', workKeys: ['/works/PLAIN'], listIds: [DEFAULT_LIST_IDS.read] }),
        ],
      }),
      followingIds: ['a'],
    });
    assert.deepEqual(groups[0].books.map((b) => b.id).sort(), ['/works/GOOD', '/works/LIKED']);
  });

  it('exclut ce que tu possèdes déjà ; sans rien d\'aimé, pas de groupe', async () => {
    // Bibliothèque non vide : les autres groupes appellent le catalogue, on le simule inerte.
    const inert = { search: async () => [], searchBooks: async () => [], getRelatedBooks: async () => [], coverUrl: () => undefined } as any;
    const mine = [makeEntry({ id: '/works/A', workKeys: ['/works/A'] })];
    const groups = await getRecommendations(inert, inert, mine, {
      activityRepo: activity({ a: [liked('/works/A')] }),
      followingIds: ['a'],
    });
    assert.ok(!groups.some((g) => g.id === 'friends-liked'));
  });

  it('classe par nombre de lecteurs qui l\'ont aimé, puis par note moyenne', async () => {
    const groups = await getRecommendations(forbiddenRepo, forbiddenRepo, [], {
      activityRepo: activity({
        a: [liked('/works/ONE', { rating: 5 }), liked('/works/TWO', { rating: 4 })],
        b: [liked('/works/TWO', { rating: 5 })],
        c: [liked('/works/THREE', { rating: 4 })],
      }),
      followingIds: ['a', 'b', 'c'],
    });
    assert.deepEqual(groups[0].books.map((b) => b.id), ['/works/TWO', '/works/ONE', '/works/THREE']);
  });

  it('un lecteur en échec est ignoré, et si tous échouent il n\'y a pas de groupe (jamais d\'erreur)', async () => {
    const partial = await getRecommendations(forbiddenRepo, forbiddenRepo, [], {
      activityRepo: activity({ a: 'throw', b: [liked('/works/B')] }),
      followingIds: ['a', 'b'],
    });
    assert.deepEqual(partial[0].books.map((b) => b.id), ['/works/B']);

    const none = await getRecommendations(forbiddenRepo, forbiddenRepo, [], {
      activityRepo: activity({ a: 'throw' }),
      followingIds: ['a'],
    });
    assert.deepEqual(none, []);
  });

  it('sans abonnement, une bibliothèque vide ne donne toujours aucune recommandation', async () => {
    assert.deepEqual(await getRecommendations(forbiddenRepo, forbiddenRepo, []), []);
  });
});
