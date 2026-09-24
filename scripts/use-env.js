#!/usr/bin/env node
/**
 * Bascule l'environnement actif (dev ou prod) en copiant `.env.dev` ou
 * `.env.prod` vers `.env` — le seul fichier qu'Expo charge réellement au
 * démarrage. Voir le README, section "Environnements (dev / prod)".
 *
 * Volontairement un script Node plutôt qu'une commande shell (`cp`/`copy`) :
 * cross-platform (fonctionne pareil sous Windows, macOS, Linux), sans
 * dépendance supplémentaire à installer.
 *
 * Pourquoi pas simplement `.env.development`/`.env.production` + NODE_ENV
 * (mécanisme intégré d'Expo) ? Parce que ce mécanisme ne s'active que pour
 * `expo export`/EAS Build (NODE_ENV=production forcé) — jamais pour
 * `expo start`, qui est le seul mode utilisé par ce projet (Expo Go, pas de
 * build). Le déclencher manuellement pour `expo start` est explicitement
 * déconseillé par la doc Expo (effets de bord sur d'autres outils qui lisent
 * NODE_ENV, ex. `npm install` qui sauterait les devDependencies). D'où ce
 * script "maison", conforme à la recommandation officielle pour ce cas.
 */
const fs = require('fs');
const path = require('path');

const env = process.argv[2];
if (env !== 'dev' && env !== 'prod') {
  console.error('Usage : node scripts/use-env.js <dev|prod>');
  process.exit(1);
}

const projectRoot = path.join(__dirname, '..');
const source = path.join(projectRoot, `.env.${env}`);
const target = path.join(projectRoot, '.env');

if (!fs.existsSync(source)) {
  console.error(
    `"${path.basename(source)}" n'existe pas encore.\n` +
      `Copie "env.${env}.example" vers ".env.${env}" et remplis tes valeurs ` +
      `(voir ce fichier pour la marche à suivre), puis relance cette commande.`,
  );
  process.exit(1);
}

fs.copyFileSync(source, target);
console.log(
  `Environnement actif : ${env} (".env" mis à jour depuis ".env.${env}"). ` +
    `Si "expo start" tourne déjà, relance-le avec "npx expo start -c" pour que Metro prenne en compte le changement.`,
);
