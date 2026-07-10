package com.guepardodelivery.entregador;

import android.annotation.SuppressLint;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.app.AlertDialog;
import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.view.WindowManager;

public class MainActivity extends Activity {

    private WebView webView;
    private ValueCallback<Uri[]> uploadMessage;
    private final static int FILECHOOSER_RESULTCODE = 1;
    
    private static final int OVERLAY_PERMISSION_REQ_CODE = 5469;
    private boolean isDialogShowing = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        wakeUpScreen();
        setContentView(R.layout.activity_main);

        checkOverlayPermission();

        webView = findViewById(R.id.webView);

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setGeolocationEnabled(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("whatsapp:") || url.startsWith("guepardo:") || url.startsWith("waze:") || url.startsWith("geo:")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        e.printStackTrace();
                        return true;
                    }
                }
                if (url.startsWith("intent:")) {
                    try {
                        Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                        if (intent != null) {
                            view.getContext().startActivity(intent);
                            return true;
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                        try {
                            Intent intentObj = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                            String fallbackUrl = intentObj.getStringExtra("browser_fallback_url");
                            if (fallbackUrl != null) {
                                view.loadUrl(fallbackUrl);
                                return true;
                            }
                        } catch (Exception ex) {
                            ex.printStackTrace();
                        }
                        return true;
                    }
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.grant(request.getResources());
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (uploadMessage != null) {
                    uploadMessage.onReceiveValue(null);
                    uploadMessage = null;
                }
                uploadMessage = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILECHOOSER_RESULTCODE);
                } catch (Exception e) {
                    uploadMessage = null;
                    return false;
                }
                return true;
            }
        });

        // Load the URL
        webView.loadUrl("https://guepardodelivery-entregador.com/?twa=true");
    }

    @Override
    protected void onStart() {
        super.onStart();
        Application.isAppInForeground = true;
        
        try {
            android.content.SharedPreferences prefs = getSharedPreferences("GuepardoPrefs", MODE_PRIVATE);
            String driverId = prefs.getString("driver_id", null);
            if (driverId != null) {
                Intent intent = new Intent(this, FloatingBubbleService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(intent);
                } else {
                    startService(intent);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        Application.isAppInForeground = false;
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
                    .setNegativeButton("Já Configurei / Mais Tarde", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            prefs.edit().putBoolean("xiaomi_dialog_shown", true).apply();
                        }
                    })
                    .show();
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent intent) {
        if (requestCode == FILECHOOSER_RESULTCODE) {
            if (null == uploadMessage) return;
            Uri[] result = intent == null || resultCode != RESULT_OK ? null : new Uri[]{intent.getData()};
            uploadMessage.onReceiveValue(result);
            uploadMessage = null;
        } else {
            super.onActivityResult(requestCode, resultCode, intent);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        wakeUpScreen();
    }

    private void wakeUpScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
}
