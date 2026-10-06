/**
 * Dates de lecture d'un livre ("Dates de lecture", 08/10/2026) : début et fin,
 * stockés comme des JOURS calendaires `YYYY-MM-DD` (pas des instants ISO) — le
 * jour où on a fini un livre est celui que l'on voit sur son calendrier, pas
 * un instant UTC qui pourrait tomber la veille ou le lendemain selon le fuseau.
 * Fonctions pures, sans dépendance : testées dans `tests/readingDates.test.ts`.
 */

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

type Day = { year: number; month: number; day: number };

function parseDay(value: string): Day | null {
  const match = ISO_DAY.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // `Date.UTC` normalise les dates impossibles (31 février → 3 mars) : on compare pour les rejeter.
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return { year, month, day };
}

/** `true` si `value` est un jour `YYYY-MM-DD` réel (pas de 31 février). */
export function isReadingDay(value: unknown): value is string {
  return typeof value === 'string' && parseDay(value) !== null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Le jour calendaire LOCAL de `date` (aujourd'hui par défaut), au format `YYYY-MM-DD`. */
export function toReadingDay(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `YYYY-MM-DD` → `Date` locale à midi (midi : à l'abri des décalages d'heure d'été), pour alimenter un sélecteur de dates. */
export function readingDayToDate(value: string): Date {
  const parsed = parseDay(value);
  if (!parsed) return new Date();
  return new Date(parsed.year, parsed.month - 1, parsed.day, 12);
}

function formatDay(day: Day, withYear: boolean): string {
  const base = `${day.day} ${MONTHS_SHORT[day.month - 1]}`;
  return withYear ? `${base} ${day.year}` : base;
}

/** « 12 oct. 2026 ». Valeur invalide → chaîne vide. */
export function formatReadingDay(value: string): string {
  const parsed = parseDay(value);
  return parsed ? formatDay(parsed, true) : '';
}

/** Nombre de jours de lecture, début et fin COMPRIS (même jour = 1). `null` si une date manque, est invalide ou si la fin précède le début. */
export function readingDays(startedAt?: string, finishedAt?: string): number | null {
  const start = startedAt ? parseDay(startedAt) : null;
  const end = finishedAt ? parseDay(finishedAt) : null;
  if (!start || !end) return null;
  const diff = Date.UTC(end.year, end.month - 1, end.day) - Date.UTC(start.year, start.month - 1, start.day);
  if (diff < 0) return null;
  return Math.round(diff / 86_400_000) + 1;
}

/**
 * Phrase courte décrivant la période de lecture, ou `null` si aucune date :
 * « Du 3 oct. au 12 oct. 2026 », « Lu le 12 oct. 2026 » (début = fin),
 * « Commencé le 3 oct. 2026 », « Terminé le 12 oct. 2026 ». Les deux années
 * ne sont affichées que si elles diffèrent.
 */
export function describeReadingPeriod(startedAt?: string, finishedAt?: string): string | null {
  const start = startedAt ? parseDay(startedAt) : null;
  const end = finishedAt ? parseDay(finishedAt) : null;
  if (start && end) {
    if (startedAt === finishedAt) return `Lu le ${formatDay(end, true)}`;
    return `Du ${formatDay(start, start.year !== end.year)} au ${formatDay(end, true)}`;
  }
  if (start) return `Commencé le ${formatDay(start, true)}`;
  if (end) return `Terminé le ${formatDay(end, true)}`;
  return null;
}
