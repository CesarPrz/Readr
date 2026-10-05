/**
 * Identifiant simple, unique dans le contexte d'un seul appareil/session —
 * suffisant pour une liste perso (jamais utilisé comme clé de sécurité). Pas
 * de dépendance externe (`uuid`, `nanoid`...) pour un besoin aussi ponctuel.
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
