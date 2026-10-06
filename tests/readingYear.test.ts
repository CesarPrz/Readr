import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_LIST_IDS } from '../src/domain/entities/ReadingList';
import { buildReadingYear, readingYears } from '../src/domain/usecases/buildReadingYear';
import { makeEntry } from './helpers';

const READ = [DEFAULT_LIST_IDS.read];

const library = [
  makeEntry({ id: 'a', listIds: READ, startedAt: '2026-01-02', finishedAt: '2026-01-10', rating: 4 }),
  makeEntry({ id: 'b', listIds: [...READ, DEFAULT_LIST_IDS.liked], startedAt: '2026-03-01', finishedAt: '2026-03-01', rating: 5 }),
  makeEntry({ id: 'c', listIds: READ, finishedAt: '2026-03-20' }), // pas de début : compte, mais pas chronométré
  makeEntry({ id: 'd', listIds: READ, startedAt: '2025-12-20', finishedAt: '2026-02-05' }), // commencé l'année d'avant
  makeEntry({ id: 'e', listIds: READ, startedAt: '2025-06-01', finishedAt: '2025-06-30', rating: 2 }),
  makeEntry({ id: 'f', listIds: READ }), // « Lu » sans date de fin
  makeEntry({ id: 'g', listIds: [DEFAULT_LIST_IDS.reading], startedAt: '2026-04-01', finishedAt: '2026-04-02' }), // repassé « En cours »
  makeEntry({ id: 'h', listIds: READ, finishedAt: 'pas une date' }),
];

describe('buildReadingYear', () => {
  const summary = buildReadingYear(library, 2026);

  it('ne garde que les livres « Lu » terminés dans l\'année, du premier au dernier terminé', () => {
    assert.deepEqual(summary.books.map((b) => b.id), ['a', 'd', 'b', 'c']);
  });

  it('range les livres par mois de fin, 12 mois toujours présents', () => {
    assert.equal(summary.months.length, 12);
    assert.deepEqual(summary.months.map((m) => m.books.length), [1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    assert.deepEqual(summary.months[2].books.map((b) => b.id), ['b', 'c']);
  });

  it('moyenne des notes sur les seuls livres notés de l\'année', () => {
    assert.equal(summary.averageRating, 4.5);
    assert.equal(summary.ratedCount, 2);
  });

  it('durées : début et fin compris, livre sans début ignoré, année précédente acceptée', () => {
    // a = 9 j, b = 1 j, d = 12 (déc.) + 36 (janv.-5 fév.) = 48 j
    assert.equal(summary.fastest?.entry.id, 'b');
    assert.equal(summary.fastest?.days, 1);
    assert.equal(summary.slowest?.entry.id, 'd');
    assert.equal(summary.slowest?.days, 48);
    assert.equal(summary.averageDays, Math.round((9 + 1 + 48) / 3));
  });

  it('compte les livres « Lu » sans date de fin valide, toutes années confondues', () => {
    assert.equal(summary.undatedCount, 2);
  });

  it('année vide : aucun chiffre inventé', () => {
    const empty = buildReadingYear(library, 2024);
    assert.equal(empty.books.length, 0);
    assert.equal(empty.averageRating, null);
    assert.equal(empty.averageDays, null);
    assert.equal(empty.fastest, null);
    assert.equal(empty.slowest, null);
  });

  it('un seul livre chronométré : pas de « plus long » distinct', () => {
    const single = buildReadingYear(library, 2025);
    assert.equal(single.fastest?.entry.id, 'e');
    assert.equal(single.fastest?.days, 30);
    assert.equal(single.slowest, null);
  });
});

describe('readingYears', () => {
  it('années avec au moins un livre terminé, plus l\'année en cours, de la plus récente à la plus ancienne', () => {
    assert.deepEqual(readingYears(library, 2026), [2026, 2025]);
    assert.deepEqual(readingYears(library, 2027), [2027, 2026, 2025]);
    assert.deepEqual(readingYears([], 2026), [2026]);
  });
});
