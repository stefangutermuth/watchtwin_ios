#!/usr/bin/env node
/**
 * Post-Install-Patch für @capacitor-community/admob.
 *
 * Das Plugin nutzt in seinem android/build.gradle
 *   getDefaultProguardFile('proguard-android.txt')
 * Das lehnt das Android Gradle Plugin ab 9.x hart ab (enthält -dontoptimize)
 * → der komplette Android-Build bricht bei der Projekt-Evaluierung ab.
 *
 * Wir ersetzen die Zeile durch die von AGP geforderte Variante
 *   getDefaultProguardFile('proguard-android-optimize.txt')
 * Idempotent; läuft automatisch via "postinstall" in package.json.
 * Sobald das Plugin upstream gefixt ist, kann dieses Script entfallen.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(
  __dirname,
  '..',
  'node_modules',
  '@capacitor-community',
  'admob',
  'android',
  'build.gradle'
);

if (!fs.existsSync(file)) {
  console.log('[patch-admob] Plugin nicht installiert — übersprungen');
  process.exit(0);
}

const src = fs.readFileSync(file, 'utf8');
const patched = src.replace(
  /getDefaultProguardFile\('proguard-android\.txt'\)/g,
  "getDefaultProguardFile('proguard-android-optimize.txt')"
);

if (patched === src) {
  console.log('[patch-admob] nichts zu patchen (bereits ok)');
} else {
  fs.writeFileSync(file, patched);
  console.log('[patch-admob] proguard-android.txt → proguard-android-optimize.txt gepatcht');
}
