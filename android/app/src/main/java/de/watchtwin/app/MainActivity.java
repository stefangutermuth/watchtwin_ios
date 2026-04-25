package de.watchtwin.app;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.view.Window;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int APP_BG = 0xFF0E0C1D;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Fenster-Hintergrund dunkel setzen bevor Capacitor die WebView lädt.
        // Auf Android 15+ mit transparenten System Bars scheint dieser
        // Hintergrund durch und die Balken wirken dunkel.
        getWindow().setBackgroundDrawable(new ColorDrawable(APP_BG));

        super.onCreate(savedInstanceState);

        Window w = getWindow();
        w.setStatusBarColor(Color.parseColor("#0e0c1d"));
        w.setNavigationBarColor(Color.parseColor("#0e0c1d"));
    }
}
