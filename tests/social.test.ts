import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FollowRepository } from '../src/domain/repositories/FollowRepository';
import type { UserSearchRepository, UserSummary } from '../src/domain/repositories/UserSearchRepository';
import { followUser } from '../src/domain/usecases/followUser';
import { MAX_USER_SEARCH_RESULTS, searchUsers } from '../src/domain/usecases/searchUsers';
import { MAX_BIO_LENGTH, updateBio } from '../src/domain/usecases/updateBio';
import { MAX_USERNAME_LENGTH, updateUsername } from '../src/domain/usecases/updateUsername';
import { normalizeForUserSearch } from '../src/utils/userSearch';

describe('normalizeForUserSearch', () => {
  it('minuscules, sans accents, espaces réduits', () => {
    assert.equal(normalizeForUserSearch('  Éloïse   DUPONT '), 'eloise dupont');
    assert.equal(normalizeForUserSearch('Lecteur Nocturne 4821'), 'lecteur nocturne 4821');
    assert.equal(normalizeForUserSearch('ÇÀ'), 'ca');
  });

  it('est idempotente (indispensable : appliquée à l\'écriture ET à la lecture)', () => {
    const once = normalizeForUserSearch('  Zoë  Ñandú ');
    assert.equal(normalizeForUserSearch(once), once);
  });
});

describe('searchUsers', () => {
  const user = (uid: string): UserSummary => ({ uid, username: `n-${uid}` });

  function repoReturning(users: UserSummary[]) {
    const calls: Array<{ prefix: string; max: number }> = [];
    const repo: UserSearchRepository = {
      searchByUsernamePrefix: async (prefix, max) => {
        calls.push({ prefix, max });
        return users;
      },
    };
    return { repo, calls };
  }

  it("n'interroge pas Firestore sous 2 caractères (après normalisation)", async () => {
    const { repo, calls } = repoReturning([user('a')]);
    assert.deepEqual(await searchUsers(repo, ' é ', 'me'), []);
    assert.equal(calls.length, 0);
  });

  it('normalise la saisie avant la requête', async () => {
    const { repo, calls } = repoReturning([]);
    await searchUsers(repo, '  ÉLO ', 'me');
    assert.equal(calls[0].prefix, 'elo');
  });

  it("retire l'utilisateur courant et plafonne à 20 résultats", async () => {
    const many = Array.from({ length: MAX_USER_SEARCH_RESULTS + 1 }, (_, i) => user(`u${i}`));
    const { repo } = repoReturning([user('me'), ...many]);
    const found = await searchUsers(repo, 'abc', 'me');
    assert.equal(found.length, MAX_USER_SEARCH_RESULTS);
    assert.ok(!found.some((u) => u.uid === 'me'));
  });

  it("laisse remonter l'erreur du dépôt (l'écran distingue « aucun résultat » de « échec »)", async () => {
    const repo: UserSearchRepository = { searchByUsernamePrefix: async () => { throw new Error('offline'); } };
    await assert.rejects(searchUsers(repo, 'abc', 'me'), /offline/);
  });
});

describe('followUser', () => {
  it('refuse de se suivre soi-même sans appeler le dépôt', async () => {
    let called = false;
    const repo = { follow: async () => { called = true; } } as unknown as FollowRepository;
    await assert.rejects(followUser(repo, 'me', 'me'));
    assert.equal(called, false);
  });

  it('suit un autre utilisateur', async () => {
    const seen: string[][] = [];
    const repo = { follow: async (a: string, b: string) => { seen.push([a, b]); } } as unknown as FollowRepository;
    await followUser(repo, 'me', 'you');
    assert.deepEqual(seen, [['me', 'you']]);
  });
});

describe('updateUsername / updateBio', () => {
  function profileRepo() {
    const patches: Array<Record<string, unknown>> = [];
    return { patches, repo: { upsertProfile: async (_uid: string, patch: Record<string, unknown>) => { patches.push(patch); } } as any };
  }

  it('le pseudo est nettoyé, réduit sur une ligne et borné', async () => {
    const { repo, patches } = profileRepo();
    assert.equal(await updateUsername(repo, 'me', '  Jean   Michel \n Dupont  '), 'Jean Michel Dupont');
    assert.equal((await updateUsername(repo, 'me', 'x'.repeat(100))).length, MAX_USERNAME_LENGTH);
    assert.equal(patches.length, 2);
  });

  it('la bio garde les retours à la ligne internes mais est bornée et trimée', async () => {
    const { repo } = profileRepo();
    assert.equal(await updateBio(repo, 'me', '  Ligne 1\nLigne 2  '), 'Ligne 1\nLigne 2');
    assert.equal((await updateBio(repo, 'me', 'y'.repeat(500))).length, MAX_BIO_LENGTH);
  });

  it('une bio vidée est écrite telle quelle (chaîne vide)', async () => {
    const { repo, patches } = profileRepo();
    assert.equal(await updateBio(repo, 'me', '   '), '');
    assert.deepEqual(patches[0], { bio: '' });
  });
});
