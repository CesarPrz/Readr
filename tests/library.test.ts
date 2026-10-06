import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_LIST_IDS } from '../src/domain/entities/ReadingList';
import { addBookToLibrary } from '../src/domain/usecases/addBookToLibrary';
import { toggleBookList } from '../src/domain/usecases/toggleBookList';
import { updateLibraryEntry } from '../src/domain/usecases/updateLibraryEntry';
import { fakeLibraryRepo, makeEntry, makeLists } from './helpers';

const LONG_AGO = '2020-01-01T00:00:00.000Z';

describe('toggleBookList', () => {
  it('ajouter à une liste exclusive retire des deux autres listes exclusives', async () => {
    const repo = fakeLibraryRepo();
    const entries = [makeEntry({ listIds: [DEFAULT_LIST_IDS.toRead, DEFAULT_LIST_IDS.liked] })];
    const next = await toggleBookList(repo, entries, makeLists(), '/works/OL1W', DEFAULT_LIST_IDS.read, true);
    assert.deepEqual(next[0].listIds.sort(), [DEFAULT_LIST_IDS.liked, DEFAULT_LIST_IDS.read].sort());
    assert.deepEqual(repo.saved, next);
  });

  it('les listes non exclusives (Aimés, perso) se cumulent avec un statut', async () => {
    const entries = [makeEntry({ listIds: [DEFAULT_LIST_IDS.reading] })];
    let next = await toggleBookList(fakeLibraryRepo(), entries, makeLists(), '/works/OL1W', DEFAULT_LIST_IDS.liked, true);
    next = await toggleBookList(fakeLibraryRepo(), next, makeLists(), '/works/OL1W', 'custom-1', true);
    assert.deepEqual(next[0].listIds.sort(), [DEFAULT_LIST_IDS.liked, DEFAULT_LIST_IDS.reading, 'custom-1'].sort());
  });

  it('retirer une liste ne touche pas aux autres', async () => {
    const entries = [makeEntry({ listIds: [DEFAULT_LIST_IDS.read, DEFAULT_LIST_IDS.liked] })];
    const next = await toggleBookList(fakeLibraryRepo(), entries, makeLists(), '/works/OL1W', DEFAULT_LIST_IDS.liked, false);
    assert.deepEqual(next[0].listIds, [DEFAULT_LIST_IDS.read]);
  });

  it("ne modifie pas les autres livres", async () => {
    const other = makeEntry({ id: '/works/OL2W', listIds: [DEFAULT_LIST_IDS.read] });
    const next = await toggleBookList(fakeLibraryRepo(), [makeEntry(), other], makeLists(), '/works/OL1W', DEFAULT_LIST_IDS.read, true);
    assert.deepEqual(next[1], other);
  });

  describe('activityAt (fil d\'amis)', () => {
    it('est mis à jour quand un statut de lecture (liste exclusive) est ajouté', async () => {
      const entries = [makeEntry({ activityAt: LONG_AGO })];
      const next = await toggleBookList(fakeLibraryRepo(), entries, makeLists(), '/works/OL1W', DEFAULT_LIST_IDS.read, true);
      assert.ok(next[0].activityAt && next[0].activityAt > LONG_AGO);
    });

    it('reste inchangé pour un like, une liste perso, ou un retrait', async () => {
      const entries = [makeEntry({ activityAt: LONG_AGO, listIds: [DEFAULT_LIST_IDS.read] })];
      for (const [listId, add] of [
        [DEFAULT_LIST_IDS.liked, true],
        ['custom-1', true],
        [DEFAULT_LIST_IDS.read, false],
      ] as const) {
        const next = await toggleBookList(fakeLibraryRepo(), entries, makeLists(), '/works/OL1W', listId, add);
        assert.equal(next[0].activityAt, LONG_AGO, `${listId} add=${add}`);
      }
    });
  });
});

describe('updateLibraryEntry', () => {
  it('une nouvelle note met activityAt à jour', async () => {
    const entries = [makeEntry({ activityAt: LONG_AGO })];
    const next = await updateLibraryEntry(fakeLibraryRepo(), entries, '/works/OL1W', { rating: 4 });
    assert.equal(next[0].rating, 4);
    assert.ok(next[0].activityAt && next[0].activityAt > LONG_AGO);
  });

  it('une note identique ou un simple texte de note ne le touchent pas', async () => {
    const entries = [makeEntry({ activityAt: LONG_AGO, rating: 3 })];
    const same = await updateLibraryEntry(fakeLibraryRepo(), entries, '/works/OL1W', { rating: 3 });
    assert.equal(same[0].activityAt, LONG_AGO);
    const text = await updateLibraryEntry(fakeLibraryRepo(), entries, '/works/OL1W', { note: 'Superbe' });
    assert.equal(text[0].activityAt, LONG_AGO);
    assert.equal(text[0].note, 'Superbe');
  });

  it('ne modifie que le livre ciblé', async () => {
    const other = makeEntry({ id: '/works/OL2W' });
    const next = await updateLibraryEntry(fakeLibraryRepo(), [makeEntry(), other], '/works/OL1W', { rating: 5 });
    assert.deepEqual(next[1], other);
  });
});

describe('addBookToLibrary', () => {
  const book = {
    id: '/works/OL9W',
    workKeys: ['/works/OL9W'],
    title: 'Neuf',
    authors: ['A'],
    languages: ['eng'],
  };

  it("ajoute en tête, dans « À lire » par défaut, avec activityAt = addedAt", async () => {
    const existing = [makeEntry()];
    const next = await addBookToLibrary(fakeLibraryRepo(), existing, book);
    assert.equal(next.length, 2);
    assert.equal(next[0].id, book.id);
    assert.deepEqual(next[0].listIds, [DEFAULT_LIST_IDS.toRead]);
    assert.equal(next[0].activityAt, next[0].addedAt);
  });

  it('respecte la liste initiale demandée', async () => {
    const next = await addBookToLibrary(fakeLibraryRepo(), [], book, DEFAULT_LIST_IDS.liked);
    assert.deepEqual(next[0].listIds, [DEFAULT_LIST_IDS.liked]);
  });

  it('ne fait rien (même référence, aucune écriture) si le livre est déjà là', async () => {
    const existing = [makeEntry({ id: book.id })];
    const repo = fakeLibraryRepo();
    const next = await addBookToLibrary(repo, existing, book);
    assert.equal(next, existing);
    assert.equal(repo.saved, null);
  });
});
