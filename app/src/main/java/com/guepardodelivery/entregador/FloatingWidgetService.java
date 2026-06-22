package com.guepardodelivery.entregador;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Toast;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class FloatingWidgetService extends Service {

    private static final String PREFS_NAME = "GuepardoPrefs";
    private static final String KEY_DRIVER_ID = "driver_id";
    private static final String CHANNEL_ID = "GuepardoFloatingWidgetChannel";
    private static final int NOTIFICATION_ID = 9988;

    private WindowManager mWindowManager;
    private View mFloatingView;
    private WindowManager.LayoutParams mParams;
    private boolean mIsViewAdded = false;
    private boolean mIsOnline = false;

    private Handler mHandler;
    private Runnable mPollingRunnable;
    private static final int POLLING_INTERVAL_MS = 15000; // 15 seconds

    private static final String SUPABASE_API_KEY = "sb_publishable_5FFYs0bPMCjQZTawObPk2A_lK5jmGJY";
    private static final String SUPABASE_URL = "https://eviukbluwrwcblwhkzwz.supabase.co";

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();

        createNotificationChannel();
        Notification notification = createNotification();
        startForeground(NOTIFICATION_ID, notification);

        mWindowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        mFloatingView = LayoutInflater.from(this).inflate(R.layout.floating_widget_layout, null);

        int layoutType;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutType = WindowManager.LayoutParams.TYPE_PHONE;
        }

        mParams = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutType,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
        );

        mParams.gravity = Gravity.TOP | Gravity.START;
        mParams.x = 100;
        mParams.y = 200;

        setupTouchListener();

        mHandler = new Handler(Looper.getMainLooper());
        mPollingRunnable = new Runnable() {
            @Override
            public void run() {
                checkOnlineStatus();
                mHandler.postDelayed(this, POLLING_INTERVAL_MS);
            }
        };
        mHandler.post(mPollingRunnable);
    }

    private void setupTouchListener() {
        mFloatingView.findViewById(R.id.root_container).setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;
            private long touchStartTime;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = mParams.x;
                        initialY = mParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        touchStartTime = System.currentTimeMillis();
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        mParams.x = initialX + (int) (event.getRawX() - initialTouchX);
                        mParams.y = initialY + (int) (event.getRawY() - initialTouchY);
                        mWindowManager.updateViewLayout(mFloatingView, mParams);
                        return true;

                    case MotionEvent.ACTION_UP:
                        long clickDuration = System.currentTimeMillis() - touchStartTime;
                        float diffX = Math.abs(event.getRawX() - initialTouchX);
                        float diffY = Math.abs(event.getRawY() - initialTouchY);

                        if (clickDuration < 200 && diffX < 10 && diffY < 10) {
                            Intent intent = new Intent(FloatingWidgetService.this, LauncherActivity.class);
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                        }
                        return true;
                }
                return false;
            }
        });
    }

    private void checkOnlineStatus() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        final String driverId = prefs.getString(KEY_DRIVER_ID, null);

        if (driverId == null || driverId.isEmpty()) {
            Toast.makeText(this, "Aviso: ID do motorista não sincronizado", Toast.LENGTH_LONG).show();
            mIsOnline = false;
            updateWidgetVisibility();
            return;
        }

        new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection urlConnection = null;
                try {
                    String queryUrl = SUPABASE_URL + "/rest/v1/profiles?id=eq." + driverId + "&select=is_online";
                    URL url = new URL(queryUrl);
                    urlConnection = (HttpURLConnection) url.openConnection();
                    urlConnection.setRequestMethod("GET");
                    urlConnection.setRequestProperty("apikey", SUPABASE_API_KEY);
                    urlConnection.setRequestProperty("Authorization", "Bearer " + SUPABASE_API_KEY);
                    urlConnection.setConnectTimeout(8000);
                    urlConnection.setReadTimeout(8000);

                    int statusCode = urlConnection.getResponseCode();
                    if (statusCode == 200) {
                        InputStream in = new BufferedInputStream(urlConnection.getInputStream());
                        BufferedReader reader = new BufferedReader(new InputStreamReader(in));
                        StringBuilder result = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) {
                            result.append(line);
                        }

                        JSONArray array = new JSONArray(result.toString());
                        final boolean isOnline = array.length() > 0 && array.getJSONObject(0).optBoolean("is_online", false);
                        mIsOnline = isOnline;

                        new Handler(Looper.getMainLooper()).post(new Runnable() {
                            @Override
                            public void run() {
                                updateWidgetVisibility();
                            }
                        });
                    } else {
                        final int finalStatusCode = statusCode;
                        new Handler(Looper.getMainLooper()).post(new Runnable() {
                            @Override
                            public void run() {
                                Toast.makeText(FloatingWidgetService.this, "Erro Supabase API: HTTP " + finalStatusCode, Toast.LENGTH_LONG).show();
                            }
                        });
                    }
                } catch (final Exception e) {
                    e.printStackTrace();
                    new Handler(Looper.getMainLooper()).post(new Runnable() {
                        @Override
                        public void run() {
                            Toast.makeText(FloatingWidgetService.this, "Erro de Conexão: " + e.getMessage(), Toast.LENGTH_LONG).show();
                        }
                    });
                } finally {
                    if (urlConnection != null) {
                        urlConnection.disconnect();
                    }
                }
            }
        }).start();
    }

    private void updateWidgetVisibility() {
        boolean shouldBeVisible = mIsOnline && !Application.isAppInForeground();
        
        if (shouldBeVisible) {
            if (!mIsViewAdded) {
                try {
                    mWindowManager.addView(mFloatingView, mParams);
                    mIsViewAdded = true;
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        } else {
            if (mIsViewAdded) {
                try {
                    mWindowManager.removeView(mFloatingView);
                    mIsViewAdded = false;
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Serviço da Bolinha Flutuante",
                    NotificationManager.IMPORTANCE_LOW
            );
            serviceChannel.setDescription("Mantém a bolinha flutuante do entregador ativa em segundo plano.");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }

    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, LauncherActivity.class);
        android.app.PendingIntent pendingIntent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingIntent = android.app.PendingIntent.getActivity(this,
                    0, notificationIntent, android.app.PendingIntent.FLAG_IMMUTABLE);
        } else {
            pendingIntent = android.app.PendingIntent.getActivity(this,
                    0, notificationIntent, 0);
        }

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Guepardo Entregador")
                .setContentText("Bolinha flutuante ativa em segundo plano.")
                .setSmallIcon(R.drawable.ic_notification_icon)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "ACTION_UPDATE_FOREGROUND_STATE".equals(intent.getAction())) {
            updateWidgetVisibility();
        } else {
            checkOnlineStatus();
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (mHandler != null && mPollingRunnable != null) {
            mHandler.removeCallbacks(mPollingRunnable);
        }
        if (mIsViewAdded && mFloatingView != null) {
            try {
                mWindowManager.removeView(mFloatingView);
                mIsViewAdded = false;
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        super.onDestroy();
    }
}
