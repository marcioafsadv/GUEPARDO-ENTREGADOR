package com.guepardodelivery.entregador;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;

public class SetDriverActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
        finish();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
        finish();
    }

    private void handleIntent(Intent intent) {
        if (intent != null && Intent.ACTION_VIEW.equals(intent.getAction())) {
            Uri data = intent.getData();
            if (data != null && "guepardo".equals(data.getScheme()) && "set-driver".equals(data.getHost())) {
                String driverId = data.getQueryParameter("id");
                SharedPreferences prefs = getSharedPreferences("GuepardoPrefs", MODE_PRIVATE);
                if (driverId != null) {
                    if ("logout".equalsIgnoreCase(driverId)) {
                        prefs.edit().remove("driver_id").apply();
                        prefs.edit().remove("last_online_status").apply();
                        android.widget.Toast.makeText(this, "Guepardo: Desconectado nativamente!", android.widget.Toast.LENGTH_SHORT).show();
                        try {
                            stopService(new Intent(this, FloatingBubbleService.class));
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    } else {
                        prefs.edit().putString("driver_id", driverId).apply();
                        android.widget.Toast.makeText(this, "Guepardo: Entregador Sincronizado!", android.widget.Toast.LENGTH_SHORT).show();
                        try {
                            Intent serviceIntent = new Intent(this, FloatingBubbleService.class);
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                startForegroundService(serviceIntent);
                            } else {
                                startService(serviceIntent);
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                }
            }
        }
    }
}
