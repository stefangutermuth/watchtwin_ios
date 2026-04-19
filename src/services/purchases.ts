import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import type { CustomerInfo } from '@revenuecat/purchases-capacitor';

// RevenueCat API Keys
const REVENUECAT_API_KEY_IOS = 'appl_MqmubChMyoImiwmswwRsulTnBjQ';
const REVENUECAT_API_KEY_ANDROID = 'test_e0lRoyPcwMtZIugJUUjVRViv0Qg'; // Android Key kommt später

// Entitlement-ID — muss mit RevenueCat Dashboard übereinstimmen
const PREMIUM_ENTITLEMENT_ID = 'GUMU - Werbeagentur Pro';

let purchasesInitialized = false;

/** Prüft ob die App nativ läuft */
function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** RevenueCat SDK initialisieren */
export async function initializePurchases(): Promise<void> {
  if (!isNative()) {
    console.log('[Purchases] Browser erkannt — RevenueCat übersprungen');
    return;
  }

  try {
    const apiKey =
      Capacitor.getPlatform() === 'ios'
        ? REVENUECAT_API_KEY_IOS
        : REVENUECAT_API_KEY_ANDROID;

    // DEV-Build: DEBUG, Prod-Build: WARN (weniger Log-Spam in Xcode)
    await Purchases.setLogLevel({
      level: import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN,
    });
    await Purchases.configure({ apiKey });
    purchasesInitialized = true;
    console.log('[Purchases] RevenueCat initialisiert');
  } catch (err) {
    console.error('[Purchases] Init fehlgeschlagen:', err);
  }
}

/**
 * Prüft ob der User Premium hat.
 * Gibt true zurück wenn Premium aktiv ist.
 */
export async function checkPremiumStatus(): Promise<boolean> {
  if (!isNative() || !purchasesInitialized) {
    return false; // Im Browser: lokaler Store entscheidet
  }

  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return isPremiumFromInfo(customerInfo);
  } catch (err) {
    console.error('[Purchases] Status-Check fehlgeschlagen:', err);
    return false;
  }
}

/** Premium-Produkt kaufen */
export async function purchasePremium(): Promise<{
  success: boolean;
  message: string;
}> {
  if (!isNative()) {
    return {
      success: false,
      message: 'Kauf nur in der App möglich.',
    };
  }

  if (!purchasesInitialized) {
    return {
      success: false,
      message: 'Shop wird geladen, bitte kurz warten...',
    };
  }

  try {
    // Verfügbare Pakete laden
    const offerings = await Purchases.getOfferings();
    const currentOffering = offerings?.current;

    if (!currentOffering || !currentOffering.availablePackages.length) {
      return {
        success: false,
        message: 'Produkt nicht verfügbar. Bitte versuche es später.',
      };
    }

    // Erstes Paket kaufen (sollte das Premium Non-Consumable sein)
    const premiumPackage = currentOffering.availablePackages[0];
    const { customerInfo } = await Purchases.purchasePackage({
      aPackage: premiumPackage,
    });

    if (isPremiumFromInfo(customerInfo)) {
      return { success: true, message: 'Premium aktiviert!' };
    }

    return {
      success: false,
      message: 'Kauf konnte nicht abgeschlossen werden.',
    };
  } catch (err: any) {
    // User hat abgebrochen
    if (err?.userCancelled || err?.code === 1) {
      return { success: false, message: '' }; // Stiller Abbruch
    }
    console.error('[Purchases] Kauf fehlgeschlagen:', err);
    return {
      success: false,
      message: 'Kauf fehlgeschlagen. Bitte versuche es erneut.',
    };
  }
}

/** Frühere Käufe wiederherstellen (Apple Review Pflicht!) */
export async function restorePurchases(): Promise<{
  success: boolean;
  isPremium: boolean;
  message: string;
}> {
  if (!isNative()) {
    return {
      success: false,
      isPremium: false,
      message: 'Wiederherstellung nur in der App möglich.',
    };
  }

  if (!purchasesInitialized) {
    return {
      success: false,
      isPremium: false,
      message: 'Shop wird geladen...',
    };
  }

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const premium = isPremiumFromInfo(customerInfo);
    return {
      success: true,
      isPremium: premium,
      message: premium
        ? 'Premium wiederhergestellt!'
        : 'Kein früherer Kauf gefunden.',
    };
  } catch (err) {
    console.error('[Purchases] Restore fehlgeschlagen:', err);
    return {
      success: false,
      isPremium: false,
      message: 'Wiederherstellung fehlgeschlagen.',
    };
  }
}

/** Helper: Prüft ob CustomerInfo das Premium-Entitlement enthält */
function isPremiumFromInfo(info: CustomerInfo): boolean {
  return (
    info.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID] !== undefined
  );
}
