/**
 * Date relative en français pour le fil d'amis ("à l'instant", "il y a 5 min",
 * "il y a 3 h", "hier", "il y a 4 j", puis une date courte comme "12 sept.").
 * `now` injectable uniquement pour rester testable.
 */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return "à l'instant";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} j`;

  return new Date(then).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
