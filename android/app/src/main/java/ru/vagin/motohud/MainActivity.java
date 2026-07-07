package ru.vagin.motohud;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    handleShareIntent(getIntent());
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    handleShareIntent(intent);
  }

  private void handleShareIntent(Intent intent) {
    if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
    String text = intent.getStringExtra(Intent.EXTRA_TEXT);
    if (text == null || text.isEmpty()) return;
    final String js = "window.__sharedYandexText=" + org.json.JSONObject.quote(text)
      + ";window.dispatchEvent(new Event('motohud-share'));";
    if (getBridge() != null && getBridge().getWebView() != null) {
      getBridge().getWebView().post(() -> getBridge().eval(js, null));
    }
  }
}
