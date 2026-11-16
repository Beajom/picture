package com.beajom.weddingplanner;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ValueCallback;
import android.widget.Toast;
import org.json.JSONObject;
import java.io.OutputStream;

public class MainActivity extends Activity {
  private static final String HOME="https://beajom.github.io/picture/wedding-planner/?native=android-v1";
  private static final int PICK_FILE=1001, SAVE_BACKUP=1002;
  private WebView web;
  private ValueCallback<Uri[]> upload;
  private byte[] backupBytes;

  @Override public void onCreate(Bundle saved) {
    super.onCreate(saved);
    getWindow().setStatusBarColor(0xfff9f0e9);
    getWindow().setNavigationBarColor(0xfff9f0e9);
    web=new WebView(this);
    web.setBackgroundColor(0xfff9f0e9);
    setContentView(web);
    WebSettings w=web.getSettings();
    w.setJavaScriptEnabled(true);
    w.setDomStorageEnabled(true);
    w.setDatabaseEnabled(true);
    w.setAllowFileAccess(false);
    w.setAllowContentAccess(true);
    w.setBuiltInZoomControls(false);
    w.setDisplayZoomControls(false);
    w.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    CookieManager.getInstance().setAcceptCookie(true);
    CookieManager.getInstance().setAcceptThirdPartyCookies(web,true);
    WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

    web.setWebViewClient(new WebViewClient(){
      @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest request){
        return handleUrl(request.getUrl());
      }
      @Override public boolean shouldOverrideUrlLoading(WebView v,String address){
        return handleUrl(Uri.parse(address));
      }
      private boolean handleUrl(Uri u){
        if("https".equalsIgnoreCase(u.getScheme())&&"beajom.github.io".equalsIgnoreCase(u.getHost())
          &&u.getPath()!=null&&u.getPath().startsWith("/picture/wedding-planner/"))return false;
        if("about".equalsIgnoreCase(u.getScheme()))return false;
        try{startActivity(new Intent(Intent.ACTION_VIEW,u));}
        catch(Exception e){Toast.makeText(MainActivity.this,"无法打开外部链接",Toast.LENGTH_SHORT).show();}
        return true;
      }
    });
    web.setWebChromeClient(new WebChromeClient(){
      @Override public boolean onJsAlert(WebView v,String url,String message,JsResult result){
        new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("知道了",(d,which)->result.confirm())
          .setOnCancelListener(d->result.cancel()).show();return true;
      }
      @Override public boolean onJsConfirm(WebView v,String url,String message,JsResult result){
        new AlertDialog.Builder(MainActivity.this).setMessage(message)
          .setPositiveButton("确认",(d,which)->result.confirm())
          .setNegativeButton("取消",(d,which)->result.cancel())
          .setOnCancelListener(d->result.cancel()).show();return true;
      }
      @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams params){
        if(upload!=null)upload.onReceiveValue(null);upload=cb;
        try{startActivityForResult(params.createIntent(),PICK_FILE);return true;}
        catch(Exception e){upload=null;cb.onReceiveValue(null);return false;}
      }
    });
    web.addJavascriptInterface(new BackupBridge(),"WeddingAndroidBackup");
    web.setDownloadListener((url,agent,disposition,mime,length)->{
      if(url!=null&&url.startsWith("blob:")){
        String quoted=JSONObject.quote(url);
        String filename="婚礼备份_"+System.currentTimeMillis()+("text/csv".equals(mime)?".csv":".json");
        web.evaluateJavascript("(async function(){try{let b=await(await fetch("+quoted+")).blob();let reader=new FileReader();reader.onloadend=function(){window.WeddingAndroidBackup.save("+JSONObject.quote(filename)+","+JSONObject.quote(mime==null?"application/json":mime)+",String(reader.result).split(',')[1]||'')};reader.readAsDataURL(b)}catch(e){console.warn(e)}})()",null);
        return;
      }
      try{
        DownloadManager.Request req=new DownloadManager.Request(Uri.parse(url));
        req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,"婚礼管家_"+System.currentTimeMillis());
        ((DownloadManager)getSystemService(DOWNLOAD_SERVICE)).enqueue(req);
      }catch(Exception e){Toast.makeText(this,"下载失败，请用浏览器导出备份",Toast.LENGTH_LONG).show();}
    });
    web.loadUrl(HOME);
  }

  private class BackupBridge {
    @JavascriptInterface public void save(String name,String mime,String base64) {
      if(web==null||web.getUrl()==null||!web.getUrl().startsWith("https://beajom.github.io/picture/wedding-planner/"))return;
      if(base64==null||base64.length()>14000000)return;
      try {
        byte[] data=Base64.decode(base64,Base64.DEFAULT);
        if(data.length>10000000)return;
        runOnUiThread(()->{
          backupBytes=data;
          Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
          intent.addCategory(Intent.CATEGORY_OPENABLE);
          intent.setType(mime==null||mime.length()==0?"application/octet-stream":mime);
          String safe=(name==null?"wedding-backup.json":name).replaceAll("[^a-zA-Z0-9._\u4e00-\u9fa5-]","_");
          intent.putExtra(Intent.EXTRA_TITLE,safe);
          try{startActivityForResult(intent,SAVE_BACKUP);}
          catch(Exception e){backupBytes=null;Toast.makeText(MainActivity.this,"无法打开文件保存窗口",Toast.LENGTH_LONG).show();}
        });
      }catch(Exception ignored){}
    }
  }

  @Override protected void onActivityResult(int request,int result,Intent data){
    super.onActivityResult(request,result,data);
    if(request==PICK_FILE){
      if(upload!=null){upload.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));upload=null;}
    }else if(request==SAVE_BACKUP){
      if(result==RESULT_OK&&data!=null&&data.getData()!=null&&backupBytes!=null){
        try(OutputStream out=getContentResolver().openOutputStream(data.getData())){
          if(out!=null){out.write(backupBytes);Toast.makeText(this,"备份已保存",Toast.LENGTH_SHORT).show();}
        }catch(Exception e){Toast.makeText(this,"保存失败",Toast.LENGTH_LONG).show();}
      }
      backupBytes=null;
    }
  }
  @Override public void onBackPressed(){
    if(web!=null&&web.canGoBack()){web.goBack();return;}
    new AlertDialog.Builder(this).setMessage("退出婚礼管家？").setPositiveButton("退出",(d,w)->finish())
      .setNegativeButton("继续使用",null).show();
  }
  @Override protected void onPause(){super.onPause();if(web!=null)web.onPause();}
  @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
  @Override protected void onDestroy(){if(web!=null){web.destroy();web=null;}super.onDestroy();}
}
