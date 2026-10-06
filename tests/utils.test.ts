import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { matchKnownGenre, matchKnownGenres } from '../src/utils/genreLabels';
import { relativeTime } from '../src/utils/relativeTime';

describe('matchKnownGenres', () => {
  it('ne renvoie jamais plus de 2 genres distincts, dans l\'ordre des sujets', () => {
    const genres = matchKnownGenres(['Detective and mystery stories', 'Crime', 'Fantasy fiction', 'Horror tales']);
    assert.equal(genres.length, 2);
    assert.equal(new Set(genres).size, 2);
  });

  it('ignore les sujets qui ne sont pas des genres (le cas « Holes »)', () => {
    assert.deepEqual(matchKnownGenres(['Holes', 'Louis Sachar', 'Juvenile literature']), []);
    assert.equal(matchKnownGenre(['Holes']), undefined);
  });

  it('est insensible à la casse et aux accents', () => {
    assert.deepEqual(matchKnownGenres(['SCIENCE FICTION']), matchKnownGenres(['science fiction']));
    assert.ok(matchKnownGenres(['Science fiction']).length >= 1);
  });

  it('respecte le paramètre max', () => {
    assert.equal(matchKnownGenres(['Fantasy', 'Horror', 'Romance'], 1).length, 1);
  });
});

describe('relativeTime', () => {
  const now = Date.parse('2026-10-08T12:00:00.000Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it('formats courts en français', () => {
    assert.equal(relativeTime(ago(10_000), now), "à l'instant");
    assert.equal(relativeTime(ago(5 * MIN), now), 'il y a 5 min');
    assert.equal(relativeTime(ago(3 * HOUR), now), 'il y a 3 h');
    assert.equal(relativeTime(ago(1 * DAY + HOUR), now), 'hier');
    assert.equal(relativeTime(ago(4 * DAY), now), 'il y a 4 j');
  });

  it('au-delà d\'une semaine, une date courte', () => {
    assert.match(relativeTime(ago(30 * DAY), now), /\d/);
  });

  it('une date invalide ou dans le futur ne casse pas', () => {
    assert.equal(relativeTime('pas une date', now), '');
    assert.equal(relativeTime(new Date(now + HOUR).toISOString(), now), "à l'instant");
  });
});
