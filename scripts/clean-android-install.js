#!/usr/bin/env node
/**
 * Désinstalle Readr de l'émulateur/appareil Android actif AVANT un nouveau
 * build (`expo run:android`), pour éviter `INSTALL_FAILED_INSUFFICIENT_STORAGE`
 * sans avoir à désinstaller l'app à la main (Paramètres → Apps → désinstaller)
 * avant chaque `npm run devclient:android:*`.
 *
 * Pourquoi cette erreur revient souvent : chaque `expo run:android` installe
 * une nouvelle APK de debug (souvent 100-200 Mo avec Hermes) par-dessus
 * l'ancienne. Sur un émulateur (AVD), le stockage interne est en général
 * petit par défaut (souvent 2 Go) et héberge aussi les données de l'app
 * (AsyncStorage, cache Firestore) en plus de l'APK elle-même — ça finit par
 * se remplir au fil des rebuilds, même si chaque APK individuelle n'est pas
 * énorme. `adb uninstall` libère la place prise par l'installation
 * précédente (APK + données) avant que la nouvelle ne soit copiée, ce qui
 * suffit dans l'immense majorité des cas.
 *
 * Non bloquant, par design : si adb n'est pas sur le PATH, si aucun appareil
 * n'est connecté, ou si l'app n'était simplement pas encore installée, on
 * avale l'erreur et on continue — au pire exactement le même résultat
 * qu'avant ce script (le prochain `expo run:android` échouera avec le même
 * message si le disque est plein pour une autre raison, ex. le cache Gradle
 * lui-même plutôt que l'app).
 *
 * Si `INSTALL_FAILED_INSUFFICIENT_STORAGE` persiste malgré ce script : le
 * disque de l'émulateur est probablement trop petit dans l'absolu (pas
 * seulement à cause des anciens builds de Readr). Fix définitif côté
 * Android Studio : Device Manager → crayon d'édition sur l'AVD concerné →
 * "Show Advanced Settings" → augmenter "Internal Storage" (ex. 2 Go → 8 Go)
 * → "Wipe Data" une fois pour appliquer. Ce changement ne se fait qu'une
 * seule fois par AVD, contrairement à ce script qui s'exécute à chaque build.
 */
const { execSync } = require('child_process');
const path = require('path');

let packageName;
try {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  packageName = require(path.join(__dirname, '..', 'app.json')).expo.android.package;
} catch {
  packageName = 'com.cesar.readr'; // repli si app.json venait à changer de forme
}

try {
  execSync(`adb uninstall ${packageName}`, { stdio: 'pipe' });
  console.log(`[Readr] Ancien build désinstallé de l'appareil/émulateur (${packageName}) avant la réinstallation.`);
} catch {
  // Rien n'était installé, adb est hors PATH, ou aucun appareil n'est
  // connecté pour l'instant — pas grave, voir le commentaire d'en-tête.
}
