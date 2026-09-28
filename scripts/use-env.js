#!/usr/bin/env node
/**
 * Bascule l'environnement actif (dev ou prod) en copiant `.env.dev` ou
 * `.env.prod` vers `.env` — le seul fichier qu'Expo charge réellement au
 * démarrage — et, s'ils existent, les fichiers de config Google Sign-In natifs
 * (`google-services.<env>.json` → `google-services.json`,
 * `GoogleService-Info.<env>.plist` → `GoogleService-Info.plist`, Phase 3 du
 * plan Firebase). Voir le README, sections "Environnements (dev / prod)" et
 * "Phase 3".
 *
 * Volontairement un script Node plutôt qu'une commande shell (`cp`/`copy`) :
 * cross-platform (fonctionne pareil sous Windows, macOS, Linux), sans
 * dépendance supplémentaire à installer.
 *
 * Pourquoi pas simplement `.env.development`/`.env.production` + NODE_ENV
 * (mécanisme intégré d'Expo) ? Parce que ce mécanisme ne s'active que pour
 * `expo export`/EAS Build (NODE_ENV=production forcé) — jamais pour
 * `expo start`, qui reste le mode utilisé au quotidien par ce projet (Expo
 * Go pour tout sauf la Phase 3, voir CLAUDE.md). Le déclencher manuellement
 * pour `expo start` est explicitement déconseillé par la doc Expo (effets de
 * bord sur d'autres outils qui lisent NODE_ENV, ex. `npm install` qui
 * sauterait les devDependencies). D'où ce script "maison", conforme à la
 * recommandation officielle pour ce cas.
 *
 * Les fichiers Google Sign-In sont copiés en best-effort (avertissement, pas
 * d'échec, s'ils n'existent pas) : quelqu'un qui ne travaille pas encore sur
 * la Phase 3 (Expo Go seul, Phases 1/2) n'a pas à les avoir.
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

// Best-effort : voir le commentaire d'en-tête. Chaque paire est indépendante
// (on peut très bien avoir google-services.<env>.json sans l'équivalent iOS).
const nativeConfigFiles = [
  { source: `google-services.${env}.json`, target: 'google-services.json' },
  { source: `GoogleService-Info.${env}.plist`, target: 'GoogleService-Info.plist' },
];
const copiedNativeConfig = [];
for (const file of nativeConfigFiles) {
  const src = path.join(projectRoot, file.source);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(projectRoot, file.target));
    copiedNativeConfig.push(file.target);
  }
}

console.log(
  `Environnement actif : ${env} (".env" mis à jour depuis ".env.${env}"). ` +
    `Si "expo start" tourne déjà, relance-le avec "npx expo start -c" pour que Metro prenne en compte le changement.`,
);
if (copiedNativeConfig.length > 0) {
  console.log(
    `Config Google Sign-In native mise à jour aussi : ${copiedNativeConfig.join(', ')}. ` +
      `Si tu utilises un dev client (Phase 3), relance "npx expo prebuild --clean" après un changement d'environnement ` +
      `pour que le projet natif reprenne le bon fichier.`,
  );
} else {
  console.log(
    `Aucun fichier Google Sign-In natif trouvé pour "${env}" (google-services.${env}.json / ` +
      `GoogleService-Info.${env}.plist) — normal si tu n'as pas encore mis en place la Phase 3, voir README.`,
  );
}
