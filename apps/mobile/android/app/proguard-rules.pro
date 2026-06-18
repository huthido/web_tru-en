# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.react.**

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Google Mobile Ads (AdMob)
-keep class com.google.android.gms.ads.** { *; }

# react-native-iap (Google Play Billing)
-keep class com.dooboolab.** { *; }
-keep class com.android.billingclient.** { *; }

# Expo modules
-keep class expo.modules.** { *; }

# Keep native methods
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}
-keepclassmembers class * {
    native <methods>;
}
