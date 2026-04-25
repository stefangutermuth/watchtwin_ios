import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import type { CustomerInfo } from '@revenuecat/purchases-capacitor';

// RevenueCat API Keys
const REVENUECAT_API_KEY_IOS = 'appl_MqmubChMyoImiwmswwRsulTnBjQ';
const REVENUECAT_API_KEY_ANDROID = 'goog_ULNaetstPhYsmARpbJCSauJKHSD';

// Entitlement-ID — muss mit RevenueCat Dashboard übereinstimmen
const PREMIUM_ENTITLEMENT_ID = 'GUMU - Werbeagentur Pro';

/**
 * Mappt RevenueCat-Fehlercodes auf benutzerfreundliche Texte.
 * Codes sind in @revenuecat/purchases-capacitor als PURCHASES_ERROR_CODE definiert.
 * Wir liefern hier gezielt Klartext, damit der User (und der App-Review-Tester)
 * nicht auf kryptische "Kauf fehlgeschlagen"-Meldungen trifft.
 */
function humanizePurchaseError(err: any): string {
  const code = String(err?.code ?? '');
  switch (code) {
    case '1': // PURCHASE_CANCELLED_ERROR
      return ''; // stiller Abbruch — wird oben rausgefiltert
    case '2': // STORE_PROBLEM_ERROR
      return 'Der App Store ist gerade nicht erreichbar. Bitte versuche es in wenigen Minuten erneut.';
    case '3': // PURCHASE_NOT_ALLOWED_ERROR
      return 'Käufe sind auf diesem Gerät nicht erlaubt. Prüfe die Einstellungen für Bildschirmzeit und Einkäufe.';
    case '4': // PURCHASE_INVALID_ERROR
      return 'Kauf nicht möglich. Bitte prüfe deine App-Store-Zahlungsmethode und versuche es erneut.';
    case '5': // PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR
      return 'Das Premium-Produkt ist gerade nicht verfügbar. Bitte versuche es später erneut.';
    case '6': // PRODUCT_ALREADY_PURCHASED_ERROR
      return 'Du hast Premium bereits gekauft. Tippe auf „Käufe wiederherstellen".';
    case '7': // RECEIPT_ALREADY_IN_USE_ERROR
      return 'Dieser Kauf ist bereits mit einer anderen Apple-ID verknüpft.';
    case '8': // INVALID_RECEIPT_ERROR
      return 'Der Beleg konnte nicht geprüft werden. Bitte starte die App neu und versuche es erneut.';
    case '10': // NETWORK_ERROR
      return 'Netzwerkfehler. Bitte prüfe deine Internet-Verbindung.';
    case '20': // PAYMENT_PENDING_ERROR
      return 'Deine Zahlung wird noch geprüft. Sobald Apple sie bestätigt, wird Premium automatisch aktiviert.';
    case '23': // CONFIGURATION_ERROR
      return 'Shop-Konfiguration konnte nicht geladen werden. Bitte versuche es später erneut.';
    default:
      return (
        err?.message ||
        'Der Kauf konnte nicht abgeschlossen werden. Bitte versuche es erneut.'
      );
  }
}

/** War der Kauf-Abbruch vom User? */
function isPurchaseCancelled(err: any): boolean {
  if (!err) return false;
  if (err.userCancelled === true) return true;
  const code = String(err.code ?? '');
  return code === '1';
}

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

  // Nicht initialisiert? Noch einmal versuchen — Init läuft asynchron und
  // kann beim ersten Kauf-Klick noch nicht fertig sein (z.B. wenn der User
  // direkt nach dem Login auf „Premium freischalten" tippt).
  if (!purchasesInitialized) {
    await initializePurchases();
  }
  if (!purchasesInitialized) {
    return {
      success: false,
      message: 'Shop konnte nicht geladen werden. Bitte prüfe deine Internet-Verbindung und versuche es erneut.',
    };
  }

  try {
    // Verfügbare Pakete laden
    console.log('[Purchases] Lade Offerings...');
    const offerings = await Purchases.getOfferings();
    const currentOffering = offerings?.current;
    console.log('[Purchases] Offerings geladen. current=', currentOffering?.identifier, 'packages=', currentOffering?.availablePackages?.length ?? 0, 'allOfferings=', Object.keys(offerings?.all || {}));

    // Wenn kein "current"-Offering konfiguriert, schauen wir in allen
    // Offerings nach dem Lifetime-Paket (Safety-Net für Config-Fehler).
    let offeringToUse = currentOffering;
    if (!offeringToUse?.availablePackages?.length) {
      const all = offerings?.all || {};
      offeringToUse =
        Object.values(all).find((o) => o?.availablePackages?.length) ?? null;
      if (offeringToUse) {
        console.warn(
          '[Purchases] Kein current-Offering — fallback auf:',
          offeringToUse.identifier,
        );
      }
    }

    if (!offeringToUse || !offeringToUse.availablePackages.length) {
      console.error('[Purchases] Keine Offerings verfügbar. offerings=', JSON.stringify(offerings));
      return {
        success: false,
        message: 'Premium ist gerade nicht verfügbar. Bitte versuche es später erneut.',
      };
    }

    // Bevorzuge das Lifetime-Paket (watchtwin_premium_lifetime), fall back zu
    // dem ersten passenden App-Store-Paket. Früher wurde einfach [0] genommen —
    // das kann aber ein Placeholder-Paket (Monthly/Yearly) aus dem Test Store
    // sein, das auf iOS nicht existiert und somit den Kauf fehlschlagen lässt.
    const premiumPackage =
      offeringToUse.lifetime ||
      offeringToUse.availablePackages.find(
        (p) => p.product?.identifier === 'watchtwin_premium_lifetime',
      ) ||
      offeringToUse.availablePackages[0];

    console.log('[Purchases] Starte Kauf für Paket:', premiumPackage.identifier, 'productId=', premiumPackage.product?.identifier, 'packageType=', premiumPackage.packageType);
    const { customerInfo } = await Purchases.purchasePackage({
      aPackage: premiumPackage,
    });

    if (isPremiumFromInfo(customerInfo)) {
      return { success: true, message: 'Premium aktiviert!' };
    }

    console.error('[Purchases] Kauf abgeschlossen aber kein Premium-Entitlement aktiv. entitlements=', Object.keys(customerInfo?.entitlements?.active || {}));
    return {
      success: false,
      message: 'Kauf konnte nicht abgeschlossen werden.',
    };
  } catch (err: any) {
    if (isPurchaseCancelled(err)) {
      return { success: false, message: '' }; // Stiller Abbruch
    }
    console.error(
      '[Purchases] Kauf fehlgeschlagen:',
      err?.code,
      err?.message,
      err?.underlyingErrorMessage,
      err,
    );
    return {
      success: false,
      message: humanizePurchaseError(err),
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
    console.log('[Purchases] Starte Restore...');
    const { customerInfo } = await Purchases.restorePurchases();
    const premium = isPremiumFromInfo(customerInfo);
    console.log('[Purchases] Restore fertig. premium=', premium, 'entitlements=', Object.keys(customerInfo?.entitlements?.active || {}));
    return {
      success: true,
      isPremium: premium,
      message: premium
        ? 'Premium wiederhergestellt!'
        : 'Kein früherer Kauf gefunden.',
    };
  } catch (err: any) {
    console.error(
      '[Purchases] Restore fehlgeschlagen:',
      err?.code,
      err?.message,
      err?.underlyingErrorMessage,
      err,
    );
    return {
      success: false,
      isPremium: false,
      message: humanizePurchaseError(err),
    };
  }
}

/** Helper: Prüft ob CustomerInfo das Premium-Entitlement enthält */
function isPremiumFromInfo(info: CustomerInfo): boolean {
  return (
    info.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID] !== undefined
  );
}
