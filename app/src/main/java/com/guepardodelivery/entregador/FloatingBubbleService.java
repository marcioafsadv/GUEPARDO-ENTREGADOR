package com.guepardodelivery.entregador;

import android.app.ActivityManager;
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

                boolean inForeground = isAppInForeground();
                if (inForeground || !isDriverOnline) {
                    // Hide/remove bubble if app is in foreground or driver is offline
                    if (rootView != null) {
                        try {
                            windowManager.removeView(rootView);
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                        rootView = null;
                    }

                    // If driver is offline, verify and stop service
                    if (!isDriverOnline) {
                        SharedPreferences prefs = getSharedPreferences("GuepardoPrefs", MODE_PRIVATE);
                        String driverId = prefs.getString("driver_id", null);
                        if (driverId == null || (hasCheckedStatus && !isDriverOnline)) {
                            stopSelf();
                            return; // Stop the runnable loop
                        }
                    }
                } else {
                    // App is in background AND driver is online: show bubble
                    if (Settings.canDrawOverlays(FloatingBubbleService.this)) {
                        if (rootView == null) {
                            createFloatingBubble();
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
        
        // Load initial status from cache to prevent flashing
        SharedPreferences prefs = getSharedPreferences("GuepardoPrefs", MODE_PRIVATE);
        isDriverOnline = prefs.getBoolean("last_online_status", false);

        String driverId = prefs.getString("driver_id", null);
        if (driverId == null) {
            android.widget.Toast.makeText(this, "Guepardo: ID do entregador ausente! Abra o app para sincronizar.", android.widget.Toast.LENGTH_LONG).show();
        }

        createNotificationChannel();
        
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

        // Start checking foreground and driver status
        handler.post(checkForegroundRunnable);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    private void checkDriverStatus() {
        SharedPreferences prefs = getSharedPreferences("GuepardoPrefs", MODE_PRIVATE);
        final String driverId = prefs.getString("driver_id", null);
        if (driverId == null) {
            isDriverOnline = false;
            hasCheckedStatus = true;
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
                    conn.setRequestProperty("apikey", "sb_publishable_5FFYs0bPMCjQZTawObPk2A_lK5jmGJY");
                    conn.setRequestProperty("Authorization", "Bearer sb_publishable_5FFYs0bPMCjQZTawObPk2A_lK5jmGJY");
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
                        
                        // Cache status
                        prefs.edit().putBoolean("last_online_status", online).apply();

                        new Handler(Looper.getMainLooper()).post(new Runnable() {
                            @Override
                            public void run() {
                                if (!hasCheckedStatus || isDriverOnline != online) {
                                    android.widget.Toast.makeText(FloatingBubbleService.this, 
                                        online ? "Guepardo: Entregador Online!" : "Guepardo: Entregador Offline!", 
                                        android.widget.Toast.LENGTH_SHORT).show();
                                }
                                isDriverOnline = online;
                                hasCheckedStatus = true;
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

        // Circular dismiss target (the trash/close circle)
        FrameLayout circle = new FrameLayout(this);
        FrameLayout.LayoutParams circleParams = new FrameLayout.LayoutParams(dpToPx(64), dpToPx(64));
        circleParams.gravity = Gravity.CENTER_HORIZONTAL | Gravity.BOTTOM;
        circleParams.bottomMargin = dpToPx(32);
        circle.setLayoutParams(circleParams);

        // Circular background (translucent red with red border)
        GradientDrawable circleBg = new GradientDrawable();
        circleBg.setShape(GradientDrawable.OVAL);
        circleBg.setColor(Color.parseColor("#33FF3B30")); // Translucent red
        circleBg.setStroke(dpToPx(2), Color.parseColor("#FF3B30"));
        circle.setBackground(circleBg);

        // Text inside the circle
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

        // Label text above the circle
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

        // Adjust window size to exactly 60dp x 60dp (same as bubble design)
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

        // Background for Main Bubble (circular, dark brown app background with Guepardo orange border)
        GradientDrawable bubbleBg = new GradientDrawable();
        bubbleBg.setShape(GradientDrawable.OVAL);
        bubbleBg.setColor(Color.parseColor("#1A0A05"));
        bubbleBg.setStroke(dpToPx(3), Color.parseColor("#FF6B00"));
        rootView.setBackground(bubbleBg);

        // App Icon inside Main Bubble
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

        // Set Touch Listener on Main Bubble for dragging, dismiss detection, and clicking
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

                        // Dynamically add the dismiss zone on touch
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

                            // Check intersection with dismiss circle
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
                                        // Haptic feedback
                                        dismissCircle.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS);
                                        // Scale up target
                                        dismissCircle.animate().scaleX(1.2f).scaleY(1.2f).setDuration(150).start();
                                        // Solid red background
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
                                        // Restore normal target state
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
                        // Dynamically remove the dismiss zone
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
        Intent intent = new Intent(this, LauncherActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        startActivity(intent);
    }

    private boolean isAppInForeground() {
        try {
            ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
            if (am == null) return false;
            java.util.List<ActivityManager.RunningTaskInfo> tasks = am.getRunningTasks(1);
            if (tasks != null && !tasks.isEmpty()) {
                ActivityManager.RunningTaskInfo topTask = tasks.get(0);
                if (topTask != null) {
                    String basePackage = topTask.baseActivity != null ? topTask.baseActivity.getPackageName() : "";
                    String topPackage = topTask.topActivity != null ? topTask.topActivity.getPackageName() : "";
                    String myPackage = getPackageName();
                    return basePackage.equals(myPackage) || topPackage.equals(myPackage);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
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
        if (rootView != null) {
            try {
                windowManager.removeView(rootView);
            } catch (Exception e) {
                e.printStackTrace();
            }
            rootView = null;
        }
        removeDismissView();
    }
}
