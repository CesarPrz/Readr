import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_LIST_IDS } from '../src/domain/entities/ReadingList';
import { addBookToLibrary } from '../src/domain/usecases/addBookToLibrary';
import { applyStatusDates } from '../src/domain/usecases/applyStatusDates';
import { toggleBookList } from '../src/domain/usecases/toggleBookList';
import { updateLibraryEntry } from '../src/domain/usecases/updateLibraryEntry';
import { readingCaption } from '../src/utils/readingCaption';
import {
  describeReadingPeriod,
  formatReadingDay,
  isReadingDay,
  readingDays,
  readingDayToDate,
  toReadingDay,
} from '../src/utils/readingDates';
import { fakeLibraryRepo, makeEntry, makeLists } from './helpers';

const TODAY = toReadingDay();

describe('utils/readingDates', () => {
  it('isReadingDay accepte les vrais jours et rejette le reste', () => {
    assert.equal(isReadingDay('2026-10-08'), true);
    assert.equal(isReadingDay('2024-02-29'), true); // bissextile
    assert.equal(isReadingDay('2026-02-29'), false);
    assert.equal(isReadingDay('2026-13-01'), false);
    assert.equal(isReadingDay('2026-1-8'), false);
    assert.equal(isReadingDay('2026-10-08T10:00:00.000Z'), false);
    assert.equal(isReadingDay(undefined), false);
    assert.equal(isReadingDay(20261008), false);
  });

  it('toReadingDay / readingDayToDate font l\'aller-retour sur le jour local', () => {
    assert.equal(toReadingDay(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
    assert.equal(toReadingDay(new Date(2026, 11, 31, 0, 1)), '2026-12-31');
    assert.equal(toReadingDay(readingDayToDate('2026-03-29')), '2026-03-29'); // jour du passage à l'heure d'été
  });

  it('formatReadingDay donne un libellé français', () => {
    assert.equal(formatReadingDay('2026-10-08'), '8 oct. 2026');
    assert.equal(formatReadingDay('2026-02-01'), '1 févr. 2026');
    assert.equal(formatReadingDay('2026-05-30'), '30 mai 2026');
    assert.equal(formatReadingDay('nimporte quoi'), '');
  });

  it('readingDays compte début et fin compris', () => {
    assert.equal(readingDays('2026-10-03', '2026-10-03'), 1);
    assert.equal(readingDays('2026-10-03', '2026-10-12'), 10);
    assert.equal(readingDays('2026-12-30', '2027-01-02'), 4);
    assert.equal(readingDays('2026-03-28', '2026-03-30'), 3); // à cheval sur l'heure d'été
    assert.equal(readingDays('2026-10-12', '2026-10-03'), null);
    assert.equal(readingDays('2026-10-03', undefined), null);
    assert.equal(readingDays(undefined, undefined), null);
  });

  it('describeReadingPeriod', () => {
    assert.equal(describeReadingPeriod('2026-10-03', '2026-10-12'), 'Du 3 oct. au 12 oct. 2026');
    assert.equal(describeReadingPeriod('2025-12-20', '2026-01-04'), 'Du 20 déc. 2025 au 4 janv. 2026');
    assert.equal(describeReadingPeriod('2026-10-12', '2026-10-12'), 'Lu le 12 oct. 2026');
    assert.equal(describeReadingPeriod('2026-10-03', undefined), 'Commencé le 3 oct. 2026');
    assert.equal(describeReadingPeriod(undefined, '2026-10-12'), 'Terminé le 12 oct. 2026');
    assert.equal(describeReadingPeriod(undefined, undefined), null);
  });
});

describe('applyStatusDates', () => {
  it('« En cours » pose le début si vide, jamais ne le remplace', () => {
    assert.equal(applyStatusDates(makeEntry(), DEFAULT_LIST_IDS.reading, '2026-10-08').startedAt, '2026-10-08');
    const already = makeEntry({ startedAt: '2026-09-01' });
    assert.equal(applyStatusDates(already, DEFAULT_LIST_IDS.reading, '2026-10-08'), already);
  });

  it('« Lu » pose la fin, et le début s\'il est vide', () => {
    const fresh = applyStatusDates(makeEntry(), DEFAULT_LIST_IDS.read, '2026-10-08');
    assert.equal(fresh.startedAt, '2026-10-08');
    assert.equal(fresh.finishedAt, '2026-10-08');

    const started = applyStatusDates(makeEntry({ startedAt: '2026-09-01' }), DEFAULT_LIST_IDS.read, '2026-10-08');
    assert.equal(started.startedAt, '2026-09-01');
    assert.equal(started.finishedAt, '2026-10-08');
  });

  it('ne remplace jamais des dates déjà saisies', () => {
    const entry = makeEntry({ startedAt: '2026-01-02', finishedAt: '2026-01-20' });
    assert.equal(applyStatusDates(entry, DEFAULT_LIST_IDS.read, '2026-10-08'), entry);
  });

  it('les autres statuts ne touchent à rien', () => {
    const entry = makeEntry({ startedAt: '2026-01-02', finishedAt: '2026-01-20' });
    assert.equal(applyStatusDates(entry, DEFAULT_LIST_IDS.toRead, '2026-10-08'), entry);
    assert.equal(applyStatusDates(entry, DEFAULT_LIST_IDS.liked, '2026-10-08'), entry);
  });
});

describe('dates de lecture dans les usecases de bibliothèque', () => {
  it('toggleBookList : passer en « En cours » puis « Lu » pose les dates', async () => {
    let next = await toggleBookList(fakeLibraryRepo(), [makeEntry()], makeLists(), '/works/OL1W', DEFAULT_LIST_IDS.reading, true);
    assert.equal(next[0].startedAt, TODAY);
    assert.equal(next[0].finishedAt, undefined);

    next = [{ ...next[0], startedAt: '2026-09-01' }];
    next = await toggleBookList(fakeLibraryRepo(), next, makeLists(), '/works/OL1W', DEFAULT_LIST_IDS.read, true);
    assert.equal(next[0].startedAt, '2026-09-01'); // la date saisie est conservée
    assert.equal(next[0].finishedAt, TODAY);
  });

  it('toggleBookList : aimer, liste perso ou retrait ne posent aucune date', async () => {
    const entries = [makeEntry()];
    for (const [listId, add] of [
      [DEFAULT_LIST_IDS.liked, true],
      ['custom-1', true],
      [DEFAULT_LIST_IDS.toRead, false],
      [DEFAULT_LIST_IDS.toRead, true],
    ] as const) {
      const next = await toggleBookList(fakeLibraryRepo(), entries, makeLists(), '/works/OL1W', listId, add);
      assert.equal(next[0].startedAt, undefined, `${listId} ${add}`);
      assert.equal(next[0].finishedAt, undefined, `${listId} ${add}`);
    }
  });

  it('toggleBookList : retirer « Lu » garde les dates déjà posées', async () => {
    const entries = [makeEntry({ listIds: [DEFAULT_LIST_IDS.read], startedAt: '2026-01-02', finishedAt: '2026-01-20' })];
    const next = await toggleBookList(fakeLibraryRepo(), entries, makeLists(), '/works/OL1W', DEFAULT_LIST_IDS.read, false);
    assert.equal(next[0].startedAt, '2026-01-02');
    assert.equal(next[0].finishedAt, '2026-01-20');
  });

  it('addBookToLibrary : ajouté directement « En cours » / « Lu » / « À lire »', async () => {
    const book = { id: '/works/OL9W', workKeys: ['/works/OL9W'], title: 'T', authors: [], languages: [] };
    const reading = await addBookToLibrary(fakeLibraryRepo(), [], book, DEFAULT_LIST_IDS.reading);
    assert.equal(reading[0].startedAt, TODAY);
    assert.equal(reading[0].finishedAt, undefined);
    const read = await addBookToLibrary(fakeLibraryRepo(), [], book, DEFAULT_LIST_IDS.read);
    assert.equal(read[0].startedAt, TODAY);
    assert.equal(read[0].finishedAt, TODAY);
    const toRead = await addBookToLibrary(fakeLibraryRepo(), [], book);
    assert.equal(toRead[0].startedAt, undefined);
  });

  it('updateLibraryEntry : enregistre, change et efface les dates', async () => {
    const repo = fakeLibraryRepo();
    let next = await updateLibraryEntry(repo, [makeEntry()], '/works/OL1W', { startedAt: '2026-10-03', finishedAt: '2026-10-12' });
    assert.equal(next[0].startedAt, '2026-10-03');
    assert.equal(next[0].finishedAt, '2026-10-12');
    assert.deepEqual(repo.saved, next);

    next = await updateLibraryEntry(repo, next, '/works/OL1W', { finishedAt: undefined });
    assert.equal(next[0].finishedAt, undefined);
    assert.equal(next[0].startedAt, '2026-10-03');
  });

  it('updateLibraryEntry : une fin avant le début est ignorée, le reste du patch passe', async () => {
    const entries = [makeEntry({ startedAt: '2026-10-10' })];
    const next = await updateLibraryEntry(fakeLibraryRepo(), entries, '/works/OL1W', { finishedAt: '2026-10-01', note: 'top' });
    assert.equal(next[0].finishedAt, undefined);
    assert.equal(next[0].startedAt, '2026-10-10');
    assert.equal(next[0].note, 'top');
  });

  it('updateLibraryEntry : début et fin envoyés ensemble sont jugés ensemble', async () => {
    const entries = [makeEntry({ startedAt: '2026-10-10', finishedAt: '2026-10-12' })];
    const next = await updateLibraryEntry(fakeLibraryRepo(), entries, '/works/OL1W', {
      startedAt: '2026-09-01',
      finishedAt: '2026-09-01',
    });
    assert.equal(next[0].startedAt, '2026-09-01');
    assert.equal(next[0].finishedAt, '2026-09-01');
  });

  it('updateLibraryEntry : un début après la fin existante est ignoré', async () => {
    const entries = [makeEntry({ startedAt: '2026-10-01', finishedAt: '2026-10-05' })];
    const next = await updateLibraryEntry(fakeLibraryRepo(), entries, '/works/OL1W', { startedAt: '2026-10-09' });
    assert.equal(next[0].startedAt, '2026-10-01');
  });

  it('updateLibraryEntry : une date invalide est ignorée', async () => {
    const entries = [makeEntry({ startedAt: '2026-10-01' })];
    const next = await updateLibraryEntry(fakeLibraryRepo(), entries, '/works/OL1W', { startedAt: '2026-02-30' });
    assert.equal(next[0].startedAt, '2026-10-01');
  });

  it('updateLibraryEntry : corriger les dates n\'est pas une activité du fil', async () => {
    const entries = [makeEntry({ activityAt: '2020-01-01T00:00:00.000Z' })];
    const next = await updateLibraryEntry(fakeLibraryRepo(), entries, '/works/OL1W', { startedAt: '2026-10-03' });
    assert.equal(next[0].activityAt, '2020-01-01T00:00:00.000Z');
  });
});

describe('readingCaption', () => {
  const entry = makeEntry({ startedAt: '2026-10-03', finishedAt: '2026-10-12' });
  it('période dans « Lu », début seul dans « En cours », rien ailleurs', () => {
    assert.equal(readingCaption(entry, DEFAULT_LIST_IDS.read), 'Du 3 oct. au 12 oct. 2026');
    assert.equal(readingCaption(entry, DEFAULT_LIST_IDS.reading), 'Commencé le 3 oct. 2026');
    assert.equal(readingCaption(entry, DEFAULT_LIST_IDS.toRead), undefined);
    assert.equal(readingCaption(entry, DEFAULT_LIST_IDS.liked), undefined);
    assert.equal(readingCaption(entry, 'custom-1'), undefined);
  });
  it('rien sans date', () => {
    assert.equal(readingCaption(makeEntry(), DEFAULT_LIST_IDS.read), undefined);
  });
});
