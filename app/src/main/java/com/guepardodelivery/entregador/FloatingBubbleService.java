package com.guepardodelivery.entregador;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.HapticFeedbackConstants;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;
import android.animation.ValueAnimator;

public class FloatingBubbleService extends Service {

    private static final String CHANNEL_ID = "floating_bubble_channel";
    private static final int NOTIFICATION_ID = 1001;

    private WindowManager windowManager;
    private FrameLayout rootView;
    private WindowManager.LayoutParams windowParams;

    // Status dot view to indicate online/offline
    private View statusDot;

    // Dismiss target views (created/removed dynamically)
    private FrameLayout dismissView;
    private WindowManager.LayoutParams dismissParams;
    private View dismissCircle;
    private TextView circleText;
    private TextView dismissText;

    private int initialX;
    private int initialY;
    private float initialTouchX;
    private float initialTouchY;
    private boolean isDragging = false;
    private boolean isNearDismiss = false;

    // Driver status check
    private boolean isDriverOnline = false;
    private boolean hasCheckedStatus = false;
    private int pollCounter = 0;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable checkForegroundRunnable = new Runnable() {
        @Override
        public void run() {
            try {
                // Fetch driver status from Supabase every 15 seconds
                if (pollCounter % 15 == 0) {
                    checkDriverStatus();
                }
                pollCounter++;

                // Usa a flag estática confiável da Application para detectar foreground
                boolean inForeground = Application.isAppInForeground;

                if (inForeground) {
                    // Esconde a bolinha quando o app está em primeiro plano
                    removeBubble();
                } else {
                    // App está em background: mostra a bolinha SEMPRE (independente do status online)
                    if (Settings.canDrawOverlays(FloatingBubbleService.this)) {
                        if (rootView == null) {
                            createFloatingBubble();
                            // Verifica o status imediatamente após criar a bolinha
                            checkDriverStatus();
                        } else {
                            // Atualiza o indicador de status (ponto verde/vermelho)
                            updateStatusDot();
                        }
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            handler.postDelayed(this, 1000);
        }
    };

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();

        promoteToForeground();

        // Verifica se há driver_id salvo
        SharedPreferences prefs = getSharedPreferences("GuepardoPrefs", MODE_PRIVATE);
        String driverId = prefs.getString("driver_id", null);
        if (driverId == null) {
            stopSelf();
            return;
        }

        // Carrega o último status conhecido do cache
        isDriverOnline = prefs.getBoolean("last_online_status", false);

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

        // Inicia o loop de verificação
        handler.post(checkForegroundRunnable);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        promoteToForeground();
        return START_STICKY;
    }

    private void promoteToForeground() {
        try {
            createNotificationChannel();
            Notification notification = buildNotification();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void checkDriverStatus() {
        SharedPreferences prefs = getSharedPreferences("GuepardoPrefs", MODE_PRIVATE);
        final String driverId = prefs.getString("driver_id", null);
        if (driverId == null) {
            return;
        }

        new Thread(new Runnable() {
            @Override
            public void run() {
                java.io.BufferedReader reader = null;
                java.net.HttpURLConnection conn = null;
                try {
                    java.net.URL url = new java.net.URL("https://eviukbluwrwcblwhkzwz.supabase.co/rest/v1/profiles?id=eq." + driverId + "&select=is_online");
                    conn = (java.net.HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setRequestProperty("apikey", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E");
                    conn.setRequestProperty("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXVrYmx1d3J3Y2Jsd2hrend6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NDg4MjAsImV4cCI6MjA4NTIyNDgyMH0.HcF64H4gAp932vPkK5ILv8Q85IQBK3-g0OyrxykxS_E");
                    conn.setConnectTimeout(5000);
                    conn.setReadTimeout(5000);

                    int responseCode = conn.getResponseCode();
                    if (responseCode == 200) {
                        java.io.InputStream in = conn.getInputStream();
                        reader = new java.io.BufferedReader(new java.io.InputStreamReader(in, "UTF-8"));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) {
                            sb.append(line);
                        }
                        String response = sb.toString();
                        final boolean online = response.contains("\"is_online\":true") || response.contains("\"is_online\": true");

                        // Salva status no cache
                        prefs.edit().putBoolean("last_online_status", online).apply();

                        new Handler(Looper.getMainLooper()).post(new Runnable() {
                            @Override
                            public void run() {
                                isDriverOnline = online;
                                hasCheckedStatus = true;
                                // Atualiza o ponto de status na bolinha, se ela estiver visível
                                updateStatusDot();
                            }
                        });
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    if (reader != null) {
                        try { reader.close(); } catch (Exception e) {}
                    }
                    if (conn != null) {
                        conn.disconnect();
                    }
                }
            }
        }).start();
    }

    private void removeBubble() {
        if (rootView != null) {
            try {
                windowManager.removeView(rootView);
            } catch (Exception e) {
                e.printStackTrace();
            }
            rootView = null;
            statusDot = null;
        }
    }

    /** Atualiza a cor do ponto de status (verde = online, vermelho = offline / cinza = verificando) */
    private void updateStatusDot() {
        if (statusDot == null) return;
        GradientDrawable dotBg = new GradientDrawable();
        dotBg.setShape(GradientDrawable.OVAL);
        if (!hasCheckedStatus) {
            dotBg.setColor(Color.parseColor("#888888")); // cinza: verificando
        } else if (isDriverOnline) {
            dotBg.setColor(Color.parseColor("#34C759")); // verde: online
        } else {
            dotBg.setColor(Color.parseColor("#FF3B30")); // vermelho: offline
        }
        statusDot.setBackground(dotBg);
    }

    private void createDismissView() {
        if (dismissView != null) return;
        if (windowManager == null) return;

        int layoutFlag;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
        }

        dismissParams = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                dpToPx(160),
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
        );
        dismissParams.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
        dismissParams.x = 0;
        dismissParams.y = 0;

        dismissView = new FrameLayout(this);
        dismissView.setVisibility(View.VISIBLE);

        // Circular dismiss target
        FrameLayout circle = new FrameLayout(this);
        FrameLayout.LayoutParams circleParams = new FrameLayout.LayoutParams(dpToPx(64), dpToPx(64));
        circleParams.gravity = Gravity.CENTER_HORIZONTAL | Gravity.BOTTOM;
        circleParams.bottomMargin = dpToPx(32);
        circle.setLayoutParams(circleParams);

        GradientDrawable circleBg = new GradientDrawable();
        circleBg.setShape(GradientDrawable.OVAL);
        circleBg.setColor(Color.parseColor("#33FF3B30"));
        circleBg.setStroke(dpToPx(2), Color.parseColor("#FF3B30"));
        circle.setBackground(circleBg);

        circleText = new TextView(this);
        FrameLayout.LayoutParams textParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        );
        circleText.setLayoutParams(textParams);
        circleText.setText("✕");
        circleText.setTextColor(Color.parseColor("#FF3B30"));
        circleText.setTextSize(24);
        circleText.setGravity(Gravity.CENTER);
        circleText.setTypeface(null, android.graphics.Typeface.BOLD);
        circle.addView(circleText);

        dismissCircle = circle;

        dismissText = new TextView(this);
        FrameLayout.LayoutParams labelParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
        );
        labelParams.gravity = Gravity.CENTER_HORIZONTAL | Gravity.BOTTOM;
        labelParams.bottomMargin = dpToPx(104);
        dismissText.setLayoutParams(labelParams);
        dismissText.setText("Arraste aqui para fechar");
        dismissText.setTextColor(Color.WHITE);
        dismissText.setTextSize(12);
        dismissText.setShadowLayer(4, 0, 2, Color.BLACK);
        dismissText.setTypeface(null, android.graphics.Typeface.BOLD);

        dismissView.addView(dismissText);
        dismissView.addView(circle);

        try {
            windowManager.addView(dismissView, dismissParams);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void removeDismissView() {
        if (dismissView != null) {
            try {
                windowManager.removeView(dismissView);
            } catch (Exception e) {
                e.printStackTrace();
            }
            dismissView = null;
            dismissCircle = null;
            circleText = null;
            dismissText = null;
        }
    }

    private void createFloatingBubble() {
        if (rootView != null) return;
        if (!Settings.canDrawOverlays(this)) return;

        int layoutFlag;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
        }

        windowParams = new WindowManager.LayoutParams(
                dpToPx(60),
                dpToPx(60),
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
        );

        windowParams.gravity = Gravity.TOP | Gravity.LEFT;
        windowParams.x = 100;
        windowParams.y = 300;

        rootView = new FrameLayout(this);
        rootView.setVisibility(View.VISIBLE);

        // Background circular escuro com borda laranja (cor Guepardo)
        GradientDrawable bubbleBg = new GradientDrawable();
        bubbleBg.setShape(GradientDrawable.OVAL);
        bubbleBg.setColor(Color.parseColor("#1A0A05"));
        bubbleBg.setStroke(dpToPx(3), Color.parseColor("#FF6B00"));
        rootView.setBackground(bubbleBg);

        // Ícone do app dentro da bolinha
        ImageView appIconView = new ImageView(this);
        FrameLayout.LayoutParams iconParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        );
        int padding = dpToPx(10);
        appIconView.setPadding(padding, padding, padding, padding);
        appIconView.setLayoutParams(iconParams);

        Drawable appIcon;
        try {
            appIcon = getPackageManager().getApplicationIcon(getPackageName());
        } catch (PackageManager.NameNotFoundException e) {
            appIcon = getResources().getDrawable(android.R.drawable.sym_def_app_icon);
        }
        appIconView.setImageDrawable(appIcon);
        rootView.addView(appIconView);

        // Ponto de status (verde = online, vermelho = offline) no canto superior direito
        View dot = new View(this);
        int dotSize = dpToPx(12);
        FrameLayout.LayoutParams dotParams = new FrameLayout.LayoutParams(dotSize, dotSize);
        dotParams.gravity = Gravity.TOP | Gravity.RIGHT;
        dotParams.topMargin = dpToPx(2);
        dotParams.rightMargin = dpToPx(2);
        dot.setLayoutParams(dotParams);
        GradientDrawable dotBg = new GradientDrawable();
        dotBg.setShape(GradientDrawable.OVAL);
        dotBg.setColor(Color.parseColor("#888888")); // começa cinza (verificando)
        dotBg.setStroke(dpToPx(1), Color.WHITE);
        dot.setBackground(dotBg);
        statusDot = dot;
        rootView.addView(dot);

        // Aplica o status inicial
        updateStatusDot();

        // Touch listener para arrastar, fechar e clicar
        rootView.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = windowParams.x;
                        initialY = windowParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        isDragging = false;
                        isNearDismiss = false;
                        createDismissView();
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        int deltaX = (int) (event.getRawX() - initialTouchX);
                        int deltaY = (int) (event.getRawY() - initialTouchY);

                        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                            isDragging = true;
                        }

                        if (isDragging) {
                            windowParams.x = initialX + deltaX;
                            windowParams.y = initialY + deltaY;
                            try {
                                windowManager.updateViewLayout(rootView, windowParams);
                            } catch (Exception e) {
                                e.printStackTrace();
                            }

                            if (dismissCircle != null && dismissView != null) {
                                int[] dismissLoc = new int[2];
                                dismissCircle.getLocationOnScreen(dismissLoc);
                                int dismissCenterX = dismissLoc[0] + dismissCircle.getWidth() / 2;
                                int dismissCenterY = dismissLoc[1] + dismissCircle.getHeight() / 2;

                                int[] bubbleLoc = new int[2];
                                rootView.getLocationOnScreen(bubbleLoc);
                                int bubbleCenterX = bubbleLoc[0] + rootView.getWidth() / 2;
                                int bubbleCenterY = bubbleLoc[1] + rootView.getHeight() / 2;

                                double distance = Math.sqrt(Math.pow(bubbleCenterX - dismissCenterX, 2)
                                        + Math.pow(bubbleCenterY - dismissCenterY, 2));

                                boolean near = distance < dpToPx(90);

                                if (near) {
                                    if (!isNearDismiss) {
                                        isNearDismiss = true;
                                        dismissCircle.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS);
                                        dismissCircle.animate().scaleX(1.2f).scaleY(1.2f).setDuration(150).start();
                                        GradientDrawable activeBg = new GradientDrawable();
                                        activeBg.setShape(GradientDrawable.OVAL);
                                        activeBg.setColor(Color.parseColor("#FF3B30"));
                                        dismissCircle.setBackground(activeBg);
                                        if (circleText != null) {
                                            circleText.setTextColor(Color.WHITE);
                                        }
                                    }
                                } else {
                                    if (isNearDismiss) {
                                        isNearDismiss = false;
                                        dismissCircle.animate().scaleX(1.0f).scaleY(1.0f).setDuration(150).start();
                                        GradientDrawable normalBg = new GradientDrawable();
                                        normalBg.setShape(GradientDrawable.OVAL);
                                        normalBg.setColor(Color.parseColor("#33FF3B30"));
                                        normalBg.setStroke(dpToPx(2), Color.parseColor("#FF3B30"));
                                        dismissCircle.setBackground(normalBg);
                                        if (circleText != null) {
                                            circleText.setTextColor(Color.parseColor("#FF3B30"));
                                        }
                                    }
                                }
                            }
                        }
                        return true;

                    case MotionEvent.ACTION_UP:
                        removeDismissView();
                        if (!isDragging) {
                            bringAppToForeground();
                        } else {
                            if (isNearDismiss) {
                                stopSelf();
                            } else {
                                snapToEdge();
                            }
                        }
                        return true;
                }
                return false;
            }
        });

        try {
            windowManager.addView(rootView, windowParams);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void snapToEdge() {
        if (rootView == null) return;
        android.graphics.Point displaySize = new android.graphics.Point();
        windowManager.getDefaultDisplay().getRealSize(displaySize);
        int screenWidth = displaySize.x;

        int bubbleWidth = rootView.getWidth();
        int currentX = windowParams.x;
        int targetX;

        if (currentX + bubbleWidth / 2 < screenWidth / 2) {
            targetX = 0;
        } else {
            targetX = screenWidth - bubbleWidth;
        }

        ValueAnimator animator = ValueAnimator.ofInt(currentX, targetX);
        animator.setDuration(250);
        animator.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override
            public void onAnimationUpdate(ValueAnimator animation) {
                if (rootView != null) {
                    windowParams.x = (int) animation.getAnimatedValue();
                    try {
                        windowManager.updateViewLayout(rootView, windowParams);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }
        });
        animator.start();
    }

    private void bringAppToForeground() {
        android.content.pm.PackageManager pm = getPackageManager();
        Intent intent = pm.getLaunchIntentForPackage(getPackageName());
        if (intent != null) {
            intent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        }
    }

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Guepardo Widget Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Serviço que mantém a bolinha flutuante ativa.");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification() {
        Intent notificationIntent = new Intent(this, LauncherActivity.class);
        PendingIntent pendingIntent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingIntent = PendingIntent.getActivity(
                    this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        } else {
            pendingIntent = PendingIntent.getActivity(
                    this, 0, notificationIntent, PendingIntent.FLAG_UPDATE_CURRENT);
        }

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        builder.setContentTitle("Guepardo Entregador")
                .setContentText("Bolinha flutuante ativa")
                .setSmallIcon(android.R.drawable.sym_def_app_icon)
                .setContentIntent(pendingIntent)
                .setOngoing(true);

        return builder.build();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        handler.removeCallbacks(checkForegroundRunnable);
        removeBubble();
        removeDismissView();
    }
}
