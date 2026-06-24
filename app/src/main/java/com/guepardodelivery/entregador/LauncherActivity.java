package com.guepardodelivery.entregador;

import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.content.Intent;
import android.content.DialogInterface;
import android.app.AlertDialog;
import android.provider.Settings;

public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    
    private static final int OVERLAY_PERMISSION_REQ_CODE = 5469;
    private boolean isDialogShowing = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Setting an orientation crashes the app due to the transparent background on Android 8.0
        // Oreo and below. We only set the orientation on Oreo and above. This only affects the
        // splash screen and Chrome will still respect the orientation.
        // See https://github.com/GoogleChromeLabs/bubblewrap/issues/496 for details.
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }

    @Override
    protected void onStart() {
        super.onStart();
        // Marca que o app está em foreground (usado pelo FloatingBubbleService)
        Application.isAppInForeground = true;
    }

    @Override
    protected void onResume() {
        super.onResume();
        checkOverlayPermission();
    }

    @Override
    protected void onStop() {
        super.onStop();
        // Marca que o app saiu do foreground (usado pelo FloatingBubbleService)
        Application.isAppInForeground = false;
        // Inicia o serviço quando o app vai para background, se o driver estiver logado
        try {
            android.content.SharedPreferences prefs = getSharedPreferences("GuepardoPrefs", MODE_PRIVATE);
            String driverId = prefs.getString("driver_id", null);
            if (driverId == null) {
                return;
            }

            Intent intent = new Intent(this, FloatingBubbleService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent);
            } else {
                startService(intent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void checkOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                if (isDialogShowing) return;
                isDialogShowing = true;
                new AlertDialog.Builder(this)
                    .setTitle("Permissão de Sobreposição")
                    .setMessage("Para exibir a bolinha flutuante e facilitar o retorno ao aplicativo durante as entregas, precisamos da permissão para 'Mostrar sobre outros aplicativos'.\n\nPor favor, ative essa permissão na tela de configurações a seguir.")
                    .setCancelable(false)
                    .setPositiveButton("Configurar", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            isDialogShowing = false;
                            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                                    Uri.parse("package:" + getPackageName()));
                            startActivityForResult(intent, OVERLAY_PERMISSION_REQ_CODE);
                        }
                    })
                    .setNegativeButton("Mais Tarde", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            isDialogShowing = false;
                        }
                    })
                    .show();
            } else {
                checkXiaomiPermissions();
            }
        }
    }

    private void checkXiaomiPermissions() {
        String manufacturer = Build.MANUFACTURER;
        if (manufacturer != null && (manufacturer.equalsIgnoreCase("Xiaomi") || manufacturer.equalsIgnoreCase("Redmi") || manufacturer.equalsIgnoreCase("Poco"))) {
            android.content.SharedPreferences prefs = getSharedPreferences("GuepardoPrefs", MODE_PRIVATE);
            boolean wasXiaomiDialogShown = prefs.getBoolean("xiaomi_dialog_shown", false);
            if (!wasXiaomiDialogShown) {
                new AlertDialog.Builder(this)
                    .setTitle("Aviso para Dispositivos Xiaomi")
                    .setMessage("Para que a bolinha flutuante funcione no seu Xiaomi (MIUI/HyperOS), você precisa ativar a permissão:\n\n• 'Abrir novas janelas enquanto executa em segundo plano'\n\nRecomendamos ativar também:\n• 'Mostrar na Tela de bloqueio'\n• 'Atalhos na Tela inicial'\n\nVamos abrir a tela de configurações para você.")
                    .setCancelable(false)
                    .setPositiveButton("Configurar", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            prefs.edit().putBoolean("xiaomi_dialog_shown", true).apply();
                            try {
                                Intent intent = new Intent("miui.intent.action.APP_PERM_EDITOR");
                                intent.setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity");
                                intent.putExtra("extra_pkgname", getPackageName());
                                startActivity(intent);
                            } catch (Exception e) {
                                e.printStackTrace();
                                try {
                                    Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                                            Uri.parse("package:" + getPackageName()));
                                    startActivity(intent);
                                } catch (Exception ex) {
                                    ex.printStackTrace();
                                }
                            }
                        }
                    })
                    .setNegativeButton("Mais Tarde", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            // Não faz nada para que seja avisado na próxima vez até configurar
                        }
                    })
                    .show();
            }
        }
    }

    @Override
    protected Uri getLaunchingUrl() {
        // Get the original launch Url.
        Uri uri = super.getLaunchingUrl();

        return uri;
    }
}
