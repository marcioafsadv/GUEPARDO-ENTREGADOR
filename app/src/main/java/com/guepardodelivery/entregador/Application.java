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



import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

public class Application extends android.app.Application {

  private static boolean isAppInForeground = false;

  public static boolean isAppInForeground() {
      return isAppInForeground;
  }

  @Override
  public void onCreate() {
      super.onCreate();
      
      registerActivityLifecycleCallbacks(new ActivityLifecycleCallbacks() {
          private int runningActivities = 0;

          @Override
          public void onActivityCreated(Activity activity, Bundle savedInstanceState) {}

          @Override
          public void onActivityStarted(Activity activity) {
              runningActivities++;
              isAppInForeground = true;
              notifyService();
          }

          @Override
          public void onActivityResumed(Activity activity) {}

          @Override
          public void onActivityPaused(Activity activity) {}

          @Override
          public void onActivityStopped(Activity activity) {
              runningActivities--;
              if (runningActivities == 0) {
                  isAppInForeground = false;
              }
              notifyService();
          }

          @Override
          public void onActivitySaveInstanceState(Activity activity, Bundle outState) {}

          @Override
          public void onActivityDestroyed(Activity activity) {}
      });
  }

  private void notifyService() {
      Intent intent = new Intent(this, FloatingWidgetService.class);
      intent.setAction("ACTION_UPDATE_FOREGROUND_STATE");
      try {
          if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
              startForegroundService(intent);
          } else {
              startService(intent);
          }
      } catch (Exception e) {
          e.printStackTrace();
      }
  }
}
