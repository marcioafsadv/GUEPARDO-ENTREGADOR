package com.guepardodelivery.entregador;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

public class SetDriverActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Intent intent = getIntent();
        if (intent != null && Intent.ACTION_VIEW.equals(intent.getAction())) {
            Uri data = intent.getData();
            if (data != null && "guepardo".equals(data.getScheme()) && "set-driver".equals(data.getHost())) {
                String driverId = data.getQueryParameter("id");
                if (driverId != null) {
                    SharedPreferences prefs = getSharedPreferences("GuepardoPrefs", MODE_PRIVATE);
                    if ("logout".equalsIgnoreCase(driverId)) {
                        prefs.edit().remove("driver_id").apply();
                        prefs.edit().remove("last_online_status").apply();
                        try {
                            stopService(new Intent(this, FloatingBubbleService.class));
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    } else {
                        prefs.edit().putString("driver_id", driverId).apply();
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
        
        // Finaliza imediatamente sem mostrar nada
        finish();
    }
}
