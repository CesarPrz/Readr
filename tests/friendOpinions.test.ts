import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_LIST_IDS } from '../src/domain/entities/ReadingList';
import type { LibraryEntry } from '../src/domain/entities/LibraryEntry';
import type { BookOpinionsRepository } from '../src/domain/repositories/BookOpinionsRepository';
import { getFriendOpinions, opinionKindOf, summarizeFriendRatings } from '../src/domain/usecases/getFriendOpinions';
import { MAX_FOLLOWED_QUERIED } from '../src/domain/usecases/getFriendFeed';
import { makeEntry } from './helpers';

describe('opinionKindOf', () => {
  it('reprend la priorité du fil et ajoute « veut le lire »', () => {
    assert.equal(opinionKindOf(makeEntry({ listIds: [DEFAULT_LIST_IDS.read] })), 'read');
    assert.equal(opinionKindOf(makeEntry({ listIds: [DEFAULT_LIST_IDS.reading] })), 'reading');
    assert.equal(opinionKindOf(makeEntry({ listIds: [DEFAULT_LIST_IDS.toRead], rating: 4 })), 'rated');
    assert.equal(opinionKindOf(makeEntry({ listIds: [DEFAULT_LIST_IDS.toRead] })), 'toRead');
  });

  it('ignore un livre seulement aimé ou dans une liste perso', () => {
    assert.equal(opinionKindOf(makeEntry({ listIds: [DEFAULT_LIST_IDS.liked] })), null);
    assert.equal(opinionKindOf(makeEntry({ listIds: ['custom-1'] })), null);
  });
});

function setup(entriesByUser: Record<string, LibraryEntry[] | 'throw'>) {
  const calls: Array<{ uid: string; keys: string[] }> = [];
  const opinionsRepo: BookOpinionsRepository = {
    fetchEntriesByWorkKeys: async (uid, keys) => {
      calls.push({ uid, keys });
      const e = entriesByUser[uid];
      if (e === 'throw') throw new Error('offline');
      return e ?? [];
    },
  };
  const profileRepo = { fetchProfile: async (uid: string) => ({ username: `user-${uid}` }) } as any;
  return { opinionsRepo, profileRepo, calls };
}

const KEYS = ['/works/OL1W', '/works/OL2W'];
const entry = (over: Partial<LibraryEntry>) => makeEntry({ listIds: [DEFAULT_LIST_IDS.read], ...over });

describe('getFriendOpinions', () => {
  it("renvoie [] sans requête si on ne suit personne ou sans clé de livre", async () => {
    const { opinionsRepo, profileRepo, calls } = setup({});
    assert.deepEqual(await getFriendOpinions(opinionsRepo, profileRepo, [], KEYS), []);
    assert.deepEqual(await getFriendOpinions(opinionsRepo, profileRepo, ['a'], []), []);
    assert.equal(calls.length, 0);
  });

  it('transmet toutes les clés du livre, et ne garde que ceux qui ont une entrée utile, du plus récent au plus ancien', async () => {
    const { opinionsRepo, profileRepo, calls } = setup({
      a: [entry({ activityAt: '2026-01-01T00:00:00.000Z', rating: 5 })],
      b: [entry({ activityAt: '2026-03-01T00:00:00.000Z', note: 'Bof' })],
      c: [],
      d: [makeEntry({ listIds: [DEFAULT_LIST_IDS.liked] })], // aimé seulement : rien à montrer
    });
    const opinions = await getFriendOpinions(opinionsRepo, profileRepo, ['a', 'b', 'c', 'd'], KEYS);
    assert.deepEqual(opinions.map((o) => o.user.uid), ['b', 'a']);
    assert.equal(opinions[0].user.username, 'user-b');
    assert.ok(calls.every((c) => c.keys.length === 2));
  });

  it('ignore un lecteur en échec mais lève si tous échouent', async () => {
    const some = setup({ a: 'throw', b: [entry({})] });
    const opinions = await getFriendOpinions(some.opinionsRepo, some.profileRepo, ['a', 'b'], KEYS);
    assert.deepEqual(opinions.map((o) => o.user.uid), ['b']);

    const all = setup({ a: 'throw', b: 'throw' });
    await assert.rejects(getFriendOpinions(all.opinionsRepo, all.profileRepo, ['a', 'b'], KEYS));
  });

  it(`n'interroge que ${MAX_FOLLOWED_QUERIED} lecteurs`, async () => {
    const { opinionsRepo, profileRepo, calls } = setup({});
    const many = Array.from({ length: MAX_FOLLOWED_QUERIED + 5 }, (_, i) => `u${i}`);
    await getFriendOpinions(opinionsRepo, profileRepo, many, KEYS);
    assert.equal(calls.length, MAX_FOLLOWED_QUERIED);
  });
});

describe('summarizeFriendRatings', () => {
  const op = (rating?: number) => ({ user: { uid: 'x', username: 'x' }, entry: entry({ rating }), kind: 'read' as const, at: '' });

  it('moyenne arrondie à une décimale, sur les seuls avis notés', () => {
    assert.deepEqual(summarizeFriendRatings([op(5), op(4), op(4), op(undefined)]), { average: 4.3, count: 3 });
  });

  it('null quand personne n\'a noté', () => {
    assert.equal(summarizeFriendRatings([op(undefined)]), null);
    assert.equal(summarizeFriendRatings([]), null);
  });
});
