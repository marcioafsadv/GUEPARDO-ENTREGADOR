/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.guepardodelivery.entregador;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.Toast;

public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    
    private static final String PREFS_NAME = "GuepardoPrefs";
    private static final String KEY_DRIVER_ID = "driver_id";
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        handleIntent(getIntent());
        super.onCreate(savedInstanceState);
        
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        if (isSetDriverIntent(intent)) {
            handleIntent(intent);
        } else {
            super.onNewIntent(intent);
            handleIntent(intent);
        }
    }

    private boolean isSetDriverIntent(Intent intent) {
        if (intent != null && intent.getData() != null) {
            Uri data = intent.getData();
            String path = data.getPath();
            String host = data.getHost();
            return (path != null && path.contains("set-driver")) || (host != null && host.contains("set-driver"));
        }
        return false;
    }

    @Override
    protected void onResume() {
        super.onResume();
        
        // Auto-start service if driver is logged in and overlay permission is granted
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String driverId = prefs.getString(KEY_DRIVER_ID, null);
        if (driverId != null && !driverId.isEmpty()) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)) {
                Intent serviceIntent = new Intent(this, FloatingWidgetService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent);
                } else {
                    startService(serviceIntent);
                }
            }
        }
    }

    private void handleIntent(Intent intent) {
        if (intent != null && intent.getData() != null) {
            // Avoid duplicate processing of the same intent (e.g. on recreate or configuration changes)
            if (intent.getBooleanExtra("intent_handled", false)) {
                return;
            }
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
                intent.putExtra("intent_handled", true);
            }
        }
    }

    private void startFloatingWidgetService() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            Toast.makeText(this, "Ative a permissão de sobreposição para usar a bolinha flutuante.", Toast.LENGTH_LONG).show();
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        } else {
            Intent serviceIntent = new Intent(this, FloatingWidgetService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        }
    }

    @Override
    protected Uri getLaunchingUrl() {
        Uri uri = super.getLaunchingUrl();
        
        if (uri != null && uri.getPath() != null && uri.getPath().contains("set-driver")) {
            return uri.buildUpon().path("/").clearQuery().build();
        }
        
        return uri;
    }
}
