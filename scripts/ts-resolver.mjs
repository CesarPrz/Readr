// Résolveur pour les tests Node (`npm test`) : le code de `src/` importe sans
// extension (`'../entities/Book'`), comme l'exige Metro/TypeScript, alors que
// Node (ESM) veut `Book.ts`. Ce hook ajoute `.ts` (ou `/index.ts`) quand le
// fichier existe. Aucune dépendance : Node 22.18+ retire déjà les types TS.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HAS_EXTENSION = /\.[cm]?[jt]sx?$|\.json$|\.node$/;

export async function resolve(specifier, context, nextResolve) {
  const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
  if (isRelative && context.parentURL && !HAS_EXTENSION.test(specifier)) {
    for (const suffix of ['.ts', '/index.ts']) {
      const candidate = new URL(specifier + suffix, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
    }
  }
  return nextResolve(specifier, context);
}
