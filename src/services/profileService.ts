import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

/**
 * Profilbild in Firebase Storage hochladen.
 * Gibt die Download-URL zurück.
 */
export async function uploadProfilePhoto(
  uid: string,
  file: File
): Promise<string> {
  // Bild komprimieren: max 512x512, JPEG 80%
  const compressed = await compressImage(file, 512, 0.8);
  const storageRef = ref(storage, `avatars/${uid}.jpg`);
  await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

/**
 * Custom-Name und/oder Custom-Photo-URL in Firestore setzen.
 * Diese Werte haben Vorrang vor Google/Apple-Werten.
 */
export async function updateCustomProfile(
  uid: string,
  updates: { customDisplayName?: string; customPhotoURL?: string }
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, updates, { merge: true });
}

/**
 * Lädt die Custom-Profil-Werte aus Firestore.
 */
export async function getCustomProfile(
  uid: string
): Promise<{ customDisplayName?: string; customPhotoURL?: string }> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return {};
  const data = snap.data();
  return {
    customDisplayName: data.customDisplayName || undefined,
    customPhotoURL: data.customPhotoURL || undefined,
  };
}

// ── Bild-Komprimierung ──────────────────────────────────────

function compressImage(
  file: File,
  maxSize: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Quadratisch zuschneiden (Mitte)
      const min = Math.min(width, height);
      const sx = (width - min) / 2;
      const sy = (height - min) / 2;

      // Auf maxSize skalieren
      const size = Math.min(min, maxSize);
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Bild konnte nicht geladen werden'));
    };
    img.src = url;
  });
}
