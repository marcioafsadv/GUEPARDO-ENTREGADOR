package com.guepardodelivery.entregador;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.Toast;

public class SetDriverActivity extends Activity {

    private static final String PREFS_NAME = "GuepardoPrefs";
    private static final String KEY_DRIVER_ID = "driver_id";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Intent intent = getIntent();
        if (intent != null && intent.getData() != null) {
            Uri data = intent.getData();
            String path = data.getPath();
            String host = data.getHost();
            
            if ((path != null && path.contains("set-driver")) || (host != null && host.contains("set-driver"))) {
                String driverId = data.getQueryParameter("id");
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                
                if (driverId != null && !driverId.isEmpty() && !driverId.equalsIgnoreCase("logout")) {
                    prefs.edit().putString(KEY_DRIVER_ID, driverId).apply();
                    startFloatingWidgetService();
                } else {
                    prefs.edit().remove(KEY_DRIVER_ID).apply();
                    stopService(new Intent(this, FloatingWidgetService.class));
                }
            }
        }
        
        finish();
    }

    private void startFloatingWidgetService() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            Toast.makeText(this, "Ative a permissão de sobreposição para usar a bolinha flutuante.", Toast.LENGTH_LONG).show();
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        } else {
            if (FloatingWidgetService.getInstance() == null) {
                Intent serviceIntent = new Intent(this, FloatingWidgetService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent);
                } else {
                    startService(serviceIntent);
                }
            } else {
                FloatingWidgetService.getInstance().updateWidgetVisibility();
            }
        }
    }
}
