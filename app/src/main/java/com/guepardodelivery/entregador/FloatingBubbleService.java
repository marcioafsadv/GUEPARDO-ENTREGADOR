package com.guepardodelivery.entregador;

import android.app.ActivityManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
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
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;

public class FloatingBubbleService extends Service {

    private static final String CHANNEL_ID = "floating_bubble_channel";
    private static final int NOTIFICATION_ID = 1001;

    private WindowManager windowManager;
    private FrameLayout rootView;
    private WindowManager.LayoutParams windowParams;

    private int initialX;
    private int initialY;
    private float initialTouchX;
    private float initialTouchY;
    private boolean isDragging = false;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable checkForegroundRunnable = new Runnable() {
        @Override
        public void run() {
            try {
                boolean inForeground = isAppInForeground();
                if (inForeground) {
                    if (rootView != null && rootView.getVisibility() == View.VISIBLE) {
                        rootView.setVisibility(View.GONE);
                    }
                } else {
                    if (Settings.canDrawOverlays(FloatingBubbleService.this)) {
                        if (rootView != null) {
                            if (rootView.getVisibility() != View.VISIBLE) {
                                rootView.setVisibility(View.VISIBLE);
                            }
                        } else {
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
        createNotificationChannel();
        
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        
        // Start checking foreground status
        handler.post(checkForegroundRunnable);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
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
                dpToPx(72),
                dpToPx(72),
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
        );

        windowParams.gravity = Gravity.TOP | Gravity.LEFT;
        windowParams.x = 100;
        windowParams.y = 300;

        rootView = new FrameLayout(this);
        rootView.setVisibility(View.GONE); // Initially hidden, checkForegroundRunnable will show it when app goes to background

        // 1. Create Main Bubble container (60dp x 60dp)
        FrameLayout bubbleView = new FrameLayout(this);
        FrameLayout.LayoutParams bubbleParams = new FrameLayout.LayoutParams(dpToPx(60), dpToPx(60));
        bubbleParams.gravity = Gravity.BOTTOM | Gravity.LEFT;
        bubbleView.setLayoutParams(bubbleParams);

        // Background for Main Bubble (circular, dark background with orange border)
        GradientDrawable bubbleBg = new GradientDrawable();
        bubbleBg.setShape(GradientDrawable.OVAL);
        bubbleBg.setColor(Color.parseColor("#1A0A05")); // Dark brown app background
        bubbleBg.setStroke(dpToPx(3), Color.parseColor("#FF6B00")); // Guepardo Orange
        bubbleView.setBackground(bubbleBg);

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
        bubbleView.addView(appIconView);

        // 2. Create Close Button (24dp x 24dp)
        TextView closeButton = new TextView(this);
        FrameLayout.LayoutParams closeParams = new FrameLayout.LayoutParams(dpToPx(24), dpToPx(24));
        closeParams.gravity = Gravity.TOP | Gravity.RIGHT;
        closeButton.setLayoutParams(closeParams);

        // Background for Close Button (circular, red with white border)
        GradientDrawable closeBg = new GradientDrawable();
        closeBg.setShape(GradientDrawable.OVAL);
        closeBg.setColor(Color.parseColor("#FF3B30")); // iOS Red
        closeBg.setStroke(dpToPx(1), Color.WHITE);
        closeButton.setBackground(closeBg);

        closeButton.setText("✕");
        closeButton.setTextColor(Color.WHITE);
        closeButton.setTextSize(12);
        closeButton.setTypeface(null, android.graphics.Typeface.BOLD);
        closeButton.setGravity(Gravity.CENTER);

        // Add views to Root
        rootView.addView(bubbleView);
        rootView.addView(closeButton);

        // Set Click Listener on Close Button
        closeButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                stopSelf();
            }
        });

        // Set Touch Listener on Main Bubble for dragging and click action
        bubbleView.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = windowParams.x;
                        initialY = windowParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        isDragging = false;
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
                            windowManager.updateViewLayout(rootView, windowParams);
                        }
                        return true;

                    case MotionEvent.ACTION_UP:
                        if (!isDragging) {
                            bringAppToForeground();
                        }
                        return true;
                }
                return false;
            }
        });

        windowManager.addView(rootView, windowParams);
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
    }
}
