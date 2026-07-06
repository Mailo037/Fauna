package ai.fauna.phone;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.http.SslError;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.net.URLEncoder;

public class MainActivity extends Activity {
    private static final String PREFS_NAME = "fauna_phone";
    private static final String SERVER_URL_KEY = "server_url";
    private static final String TOKEN_KEY = "token";

    private SharedPreferences prefs;
    private WebView webView;
    private EditText serverInput;
    private EditText tokenInput;
    private TextView statusText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        String serverUrl = prefs.getString(SERVER_URL_KEY, "");
        String token = prefs.getString(TOKEN_KEY, "");
        if (!serverUrl.isEmpty() && !token.isEmpty()) {
            loadRemoteUi(serverUrl, token);
        } else {
            showConnectionForm("");
        }
    }

    private int dp(float value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private GradientDrawable rounded(int color, float radiusDp, int strokeColor) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(dp(radiusDp));
        if (strokeColor != 0) {
            drawable.setStroke(dp(1), strokeColor);
        }
        return drawable;
    }

    private TextView label(String text) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextColor(Color.rgb(203, 211, 220));
        view.setTextSize(13);
        view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }

    private EditText input(String hint, String value) {
        EditText view = new EditText(this);
        view.setSingleLine(true);
        view.setHint(hint);
        view.setText(value);
        view.setTextColor(Color.rgb(244, 246, 248));
        view.setHintTextColor(Color.rgb(116, 126, 138));
        view.setTextSize(15);
        view.setPadding(dp(12), 0, dp(12), 0);
        view.setMinHeight(dp(46));
        view.setBackground(rounded(Color.rgb(17, 19, 22), 8, Color.argb(46, 255, 255, 255)));
        return view;
    }

    private void addWithTopMargin(LinearLayout parent, android.view.View child, int topDp) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        params.topMargin = dp(topDp);
        parent.addView(child, params);
    }

    private void showConnectionForm(String message) {
        if (webView != null) {
            webView.stopLoading();
            webView = null;
        }

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(21, 23, 26));

        LinearLayout outer = new LinearLayout(this);
        outer.setGravity(Gravity.CENTER);
        outer.setPadding(dp(22), dp(22), dp(22), dp(22));
        scroll.addView(outer, new ScrollView.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(20), dp(20), dp(20), dp(20));
        panel.setBackground(rounded(Color.rgb(29, 32, 36), 8, Color.argb(34, 255, 255, 255)));
        outer.addView(panel, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        TextView title = new TextView(this);
        title.setText("Fauna Phone");
        title.setTextColor(Color.rgb(244, 246, 248));
        title.setTextSize(28);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        panel.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText("Connect to your PC");
        subtitle.setTextColor(Color.rgb(154, 163, 175));
        subtitle.setTextSize(14);
        addWithTopMargin(panel, subtitle, 4);

        addWithTopMargin(panel, label("Phone URL"), 18);
        serverInput = input("http://192.168.1.20:8899", prefs.getString(SERVER_URL_KEY, ""));
        serverInput.setInputType(InputType.TYPE_TEXT_VARIATION_URI);
        addWithTopMargin(panel, serverInput, 7);

        addWithTopMargin(panel, label("Token"), 14);
        tokenInput = input("Paste token", prefs.getString(TOKEN_KEY, ""));
        tokenInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
        addWithTopMargin(panel, tokenInput, 7);

        Button connectButton = new Button(this);
        connectButton.setText("Connect");
        connectButton.setAllCaps(false);
        connectButton.setTextColor(Color.rgb(14, 18, 15));
        connectButton.setTextSize(15);
        connectButton.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        connectButton.setMinHeight(dp(46));
        connectButton.setBackground(rounded(Color.rgb(156, 214, 126), 8, 0));
        addWithTopMargin(panel, connectButton, 18);

        statusText = new TextView(this);
        statusText.setText(message);
        statusText.setTextColor(Color.rgb(154, 163, 175));
        statusText.setTextSize(13);
        addWithTopMargin(panel, statusText, 12);

        connectButton.setOnClickListener(view -> {
            String serverUrl = normalizeServerUrl(serverInput.getText().toString());
            String token = tokenInput.getText().toString().trim();
            if (serverUrl.isEmpty() || token.isEmpty()) {
                statusText.setText("URL and token are required.");
                return;
            }
            prefs.edit()
                .putString(SERVER_URL_KEY, serverUrl)
                .putString(TOKEN_KEY, token)
                .apply();
            loadRemoteUi(serverUrl, token);
        });

        setContentView(scroll);
    }

    private String normalizeServerUrl(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (value.isEmpty()) return "";
        if (!value.startsWith("http://") && !value.startsWith("https://")) {
            value = "http://" + value;
        }
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }
        if (value.endsWith("/mobile")) {
            value = value.substring(0, value.length() - "/mobile".length());
        }
        return value;
    }

    private String encodeUrlPart(String value) {
        try {
            return URLEncoder.encode(value, "UTF-8");
        } catch (Exception ignored) {
            return "";
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void loadRemoteUi(String serverUrl, String token) {
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(21, 23, 26));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request != null && request.isForMainFrame()) {
                    showConnectionForm("Could not reach the PC. Check the URL, Wi-Fi, and remote access toggle.");
                }
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
                showConnectionForm("Secure connection failed. Use the HTTP Phone URL shown by Fauna Desktop.");
            }
        });

        setContentView(webView);
        String encodedToken = encodeUrlPart(token);
        webView.loadUrl(normalizeServerUrl(serverUrl) + "/mobile/#token=" + encodedToken);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        if (webView != null) {
            showConnectionForm("");
            return;
        }
        super.onBackPressed();
    }
}
