package de.watchtwin.app;

import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int APP_BG = 0xFF0E0C1D;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Fenster-Hintergrund dunkel setzen bevor Capacitor die WebView lädt.
        // Ab Android 15/16 sind die System-Bars transparent (Edge-to-Edge ist
        // erzwungen, das frühere windowOptOutEdgeToEdgeEnforcement ist ab
        // targetSdk 36 wirkungslos und von Google als veraltet markiert).
        // Dieser Hintergrund scheint hinter den Bars durch → sie wirken dunkel.
        // Die Insets für den WebView-Inhalt setzt Capacitor selbst.
        getWindow().setBackgroundDrawable(new ColorDrawable(APP_BG));

        super.onCreate(savedInstanceState);

        // Helle Icons auf dunklem Grund — ersetzt die veralteten
        // setStatusBarColor()/setNavigationBarColor()-Aufrufe (deprecated API 35).
        // Auf älteren Versionen liefert das Theme (styles.xml) die Bar-Farben.
        WindowInsetsControllerCompat insets =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        insets.setAppearanceLightStatusBars(false);
        insets.setAppearanceLightNavigationBars(false);
    }
}
