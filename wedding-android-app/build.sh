#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p app/src/main/java/com/chongfeijinli/wedding app/src/main/res/values app/src/main/res/values-v31 app/src/main/res/drawable-nodpi
cat > settings.gradle <<'EOF'
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name='WeddingPlanner'
include ':app'
EOF
cat > build.gradle <<'EOF'
plugins { id 'com.android.application' version '8.7.3' apply false }
EOF
cat > gradle.properties <<'EOF'
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
EOF
cat > app/build.gradle <<'EOF'
plugins { id 'com.android.application' }
android {
 namespace 'com.chongfeijinli.wedding'
 compileSdk 35
 defaultConfig { applicationId 'com.chongfeijinli.wedding'; minSdk 26; targetSdk 35; versionCode 1; versionName '1.0.0' }
 buildTypes { release { minifyEnabled false } }
 compileOptions { sourceCompatibility JavaVersion.VERSION_17; targetCompatibility JavaVersion.VERSION_17 }
}
EOF
cat > app/src/main/AndroidManifest.xml <<'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
 <uses-permission android:name="android.permission.INTERNET"/>
 <application android:allowBackup="false" android:usesCleartextTraffic="false" android:label="@string/app_name" android:icon="@drawable/ic_launcher" android:roundIcon="@drawable/ic_launcher" android:theme="@style/AppTheme">
  <activity android:name=".MainActivity" android:exported="true" android:windowSoftInputMode="adjustResize">
   <intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter>
  </activity>
 </application>
</manifest>
EOF
cat > app/src/main/res/values/strings.xml <<'EOF'
<resources><string name="app_name">婚礼管家</string></resources>
EOF
cat > app/src/main/res/values/styles.xml <<'EOF'
<resources>
 <style name="AppTheme" parent="android:style/Theme.Material.Light.NoActionBar">
  <item name="android:colorAccent">#C6938B</item>
  <item name="android:statusBarColor">#FBF8F6</item>
  <item name="android:navigationBarColor">#FBF8F6</item>
  <item name="android:windowLightStatusBar">true</item>
  <item name="android:windowBackground">#FBF8F6</item>
 </style>
</resources>
EOF
cat > app/src/main/res/values-v31/styles.xml <<'EOF'
<resources>
 <style name="AppTheme" parent="android:style/Theme.Material.Light.NoActionBar">
  <item name="android:colorAccent">#C6938B</item>
  <item name="android:statusBarColor">#FBF8F6</item>
  <item name="android:navigationBarColor">#FBF8F6</item>
  <item name="android:windowLightStatusBar">true</item>
  <item name="android:windowBackground">#FBF8F6</item>
  <item name="android:windowSplashScreenBackground">#FBF8F6</item>
  <item name="android:windowSplashScreenAnimatedIcon">@drawable/ic_launcher</item>
  <item name="android:windowSplashScreenAnimationDuration">0</item>
 </style>
</resources>
EOF
cat > app/src/main/java/com/chongfeijinli/wedding/MainActivity.java <<'EOF'
package com.chongfeijinli.wedding;
import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.os.Environment;
import android.content.Intent;
import android.content.ContentValues;
import android.provider.MediaStore;
import android.net.Uri;
import android.graphics.Color;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.ValueCallback;
import android.widget.Toast;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
 private static final String HOME="https://beajom.github.io/picture/wedding-planner/";
 private static final int PICK=1001;
 private WebView web;
 private ValueCallback<Uri[]> picker;
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  getWindow().setStatusBarColor(Color.rgb(251,248,246));
  getWindow().setNavigationBarColor(Color.rgb(251,248,246));
  getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
  web=new WebView(this);web.setBackgroundColor(Color.rgb(251,248,246));setContentView(web);
  WebSettings settings=web.getSettings();
  settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);
  settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  CookieManager.getInstance().setAcceptCookie(true);
  CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
  web.addJavascriptInterface(new DownloadBridge(),"WeddingAndroid");
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams params){
    if(picker!=null)picker.onReceiveValue(null);
    picker=cb;
    try{startActivityForResult(params.createIntent(),PICK);}catch(Exception e){picker=null;cb.onReceiveValue(null);return false;}
    return true;
   }
  });
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest req){
    Uri uri=req.getUrl();
    if("https".equalsIgnoreCase(uri.getScheme())&&"beajom.github.io".equalsIgnoreCase(uri.getHost())
       &&uri.getPath()!=null&&uri.getPath().startsWith("/picture/wedding-planner/"))return false;
    try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}
    catch(Exception e){Toast.makeText(MainActivity.this,"无法打开外部链接",Toast.LENGTH_SHORT).show();}
    return true;
   }
  });
  web.loadUrl(HOME);
 }
 private final class DownloadBridge {
  @JavascriptInterface public void saveText(String text,String fileName,String mime){
   final String safe=(fileName==null?"wedding-backup.txt":fileName).replace('/','_').replace('\\','_').replace("..","_");
   runOnUiThread(()->{
    if(Build.VERSION.SDK_INT<29){Toast.makeText(MainActivity.this,"请在手机浏览器导出备份",Toast.LENGTH_LONG).show();return;}
    try{
     ContentValues v=new ContentValues();
     v.put(MediaStore.MediaColumns.DISPLAY_NAME,safe);
     v.put(MediaStore.MediaColumns.MIME_TYPE,mime==null?"text/plain":mime.split(";")[0]);
     v.put(MediaStore.MediaColumns.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS);
     Uri dest=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,v);
     if(dest==null)throw new IllegalStateException();
     try(OutputStream out=getContentResolver().openOutputStream(dest)){
      if(out==null)throw new IllegalStateException();
      out.write(text.getBytes(StandardCharsets.UTF_8));
     }
     Toast.makeText(MainActivity.this,"已保存到下载目录："+safe,Toast.LENGTH_LONG).show();
    }catch(Exception e){Toast.makeText(MainActivity.this,"保存失败，请用浏览器导出",Toast.LENGTH_LONG).show();}
   });
  }
 }
 @Override protected void onActivityResult(int code,int result,Intent data){
  super.onActivityResult(code,result,data);
  if(code==PICK&&picker!=null){picker.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));picker=null;}
 }
 @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
 @Override protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("WeddingAndroid");web.destroy();web=null;}super.onDestroy();}
}
EOF
python3 - <<'PY'
import pathlib
import cairosvg
p=pathlib.Path('app/src/main/res/drawable-nodpi/ic_launcher.png')
svg='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f1a6bf"/><stop offset=".5" stop-color="#e5759e"/><stop offset="1" stop-color="#d33178"/></linearGradient><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff4a3"/><stop offset="1" stop-color="#ffd14b"/></linearGradient></defs><rect width="512" height="512" rx="105" fill="url(#p)"/><circle cx="209" cy="298" r="100" fill="none" stroke="url(#g)" stroke-width="27"/><circle cx="303" cy="298" r="100" fill="none" stroke="url(#g)" stroke-width="27"/><path d="M256 246 C202 166 140 206 140 257 C140 308 208 343 256 395 C304 343 372 308 372 257 C372 206 310 166 256 246Z" fill="#fffdf9"/></svg>'''
cairosvg.svg2png(bytestring=svg.encode(),write_to=str(p),output_width=512,output_height=512)
print('Wrote badge-free pink heart-and-rings launcher icon')
PY
