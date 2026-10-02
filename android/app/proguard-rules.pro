# WatchTwin — R8/ProGuard-Regeln für den Release-Build (minifyEnabled + shrinkResources).
#
# Basis ist getDefaultProguardFile('proguard-android-optimize.txt') (siehe build.gradle),
# das u. a. *Annotation*, Signature, InnerClasses und @JavascriptInterface-Methoden behält.
# Bibliotheks-Regeln werden automatisch gemerged (consumerProguardFiles der AARs):
#   - @capacitor/android   → Plugin-Subklassen, @CapacitorPlugin/@PluginMethod, Cordova
#   - play-services-ads    → AdMob (Google Mobile Ads SDK)
#   - firebase-auth/-crashlytics, play-services-*, RevenueCat purchases-android,
#     Play Billing Library → eigene Consumer-Rules
# Die tatsächlich angewandte Gesamtkonfiguration steht nach dem Build in
#   android/app/build/outputs/mapping/release/configuration.txt

# --- Crashlytics: lesbare Stacktraces -------------------------------------------------
# Das Crashlytics-Gradle-Plugin lädt mapping.txt beim bundleRelease/assembleRelease hoch.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
-keep public class * extends java.lang.Exception

# --- Capacitor Bridge ------------------------------------------------------------------
# Capacitor lädt die nativen Plugin-Klassen per Class.forName() aus capacitor.plugins.json
# und ruft @PluginMethod-Methoden per Reflection auf. Diese Regeln entsprechen der
# Capacitor-Vorlage (node_modules/@capacitor/android/capacitor/proguard-rules.pro) und
# greifen zusätzlich zu den Consumer-Rules, falls die Bibliothek sie einmal nicht liefert.
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep @com.getcapacitor.NativePlugin public class * {
    @com.getcapacitor.PluginMethod public <methods>;
}
# WebView → native Bridge (MessageHandler.postMessage) läuft über @JavascriptInterface.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
# Cordova-Plugin-Bridge (capacitor-cordova-android-plugins; derzeit ohne Plugins)
-keep public class * extends org.apache.cordova.* {
    public <methods>;
    public <fields>;
}

# --- @capacitor-firebase/authentication: optionale Provider-SDKs ------------------------
# Das Plugin referenziert das Facebook-Login-SDK nur per compileOnly (rgcfaIncludeFacebook
# ist false, wir nutzen nur google.com/apple.com). Ohne diese Regeln bricht R8 mit
# "Missing class com.facebook.*" ab (siehe build/outputs/mapping/release/missing_rules.txt).
-dontwarn com.facebook.**
