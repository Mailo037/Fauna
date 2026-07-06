package ai.fauna.phone;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebStorage;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner;
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.UUID;
import java.net.URLEncoder;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends Activity {
    private static final String PREFS_NAME = "fauna_phone";
    private static final String SERVER_URL_KEY = "server_url";
    private static final String TOKEN_KEY = "token";
    private static final String DEVICE_ID_KEY = "device_id";
    private static final int FILE_CHOOSER_REQUEST_CODE = 42;
    private static final int COLOR_BG = 0xFF111214;
    private static final int COLOR_PANEL = 0xFF202020;
    private static final int COLOR_PANEL_SOFT = 0xFF242424;
    private static final int COLOR_INPUT = 0xFF151515;
    private static final int COLOR_BORDER = 0x1FFFFFFF;
    private static final int COLOR_TEXT = 0xFFF5F5F5;
    private static final int COLOR_MUTED = 0x8AFFFFFF;
    private static final int COLOR_DIM = 0x66FFFFFF;
    private static final int COLOR_ACCENT = 0xFF5B7CFA;

    private SharedPreferences prefs;
    private WebView webView;
    private EditText serverInput;
    private EditText tokenInput;
    private TextView statusText;
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemBarsWindow();
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        if (handlePairingIntent(getIntent())) return;

        String serverUrl = prefs.getString(SERVER_URL_KEY, "");
        String token = prefs.getString(TOKEN_KEY, "");
        if (!serverUrl.isEmpty() && !token.isEmpty()) {
            loadRemoteUi(serverUrl, token);
        } else {
            showConnectionForm("");
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handlePairingIntent(intent);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applySystemBarsWindow();
    }

    private void applySystemBarsWindow() {
        Window window = getWindow();
        if (window == null) return;
        window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        window.setStatusBarColor(COLOR_BG);
        window.setNavigationBarColor(COLOR_BG);
        window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
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

    private TextView text(String value, float sizeSp, int color, int style) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextColor(color);
        view.setTextSize(sizeSp);
        view.setIncludeFontPadding(true);
        if (style != 0) view.setTypeface(Typeface.DEFAULT, style);
        return view;
    }

    private TextView label(String text) {
        TextView view = text(text, 11, COLOR_MUTED, Typeface.BOLD);
        return view;
    }

    private EditText input(String hint, String value) {
        EditText view = new EditText(this);
        view.setSingleLine(true);
        view.setHint(hint);
        view.setText(value);
        view.setTextColor(COLOR_TEXT);
        view.setHintTextColor(COLOR_DIM);
        view.setTextSize(15);
        view.setPadding(dp(12), 0, dp(12), 0);
        view.setMinHeight(dp(46));
        view.setBackground(rounded(COLOR_INPUT, 8, COLOR_BORDER));
        return view;
    }

    private Button actionButton(String text, boolean primary) {
        Button button = new Button(this);
        button.setText(text);
        button.setAllCaps(false);
        button.setTextColor(COLOR_TEXT);
        button.setTextSize(15);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setMinHeight(dp(46));
        button.setBackground(rounded(primary ? COLOR_ACCENT : COLOR_PANEL_SOFT, 9, primary ? 0 : COLOR_BORDER));
        return button;
    }

    private TextView iconButton(String text) {
        TextView button = text(text, 16, COLOR_TEXT, Typeface.BOLD);
        button.setGravity(Gravity.CENTER);
        button.setMinWidth(dp(44));
        button.setMinHeight(dp(44));
        button.setBackground(rounded(COLOR_PANEL_SOFT, 999, COLOR_BORDER));
        return button;
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
        scroll.setBackgroundColor(COLOR_BG);

        LinearLayout outer = new LinearLayout(this);
        outer.setGravity(Gravity.CENTER);
        outer.setPadding(dp(24), dp(24), dp(24), dp(24));
        scroll.addView(outer, new ScrollView.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(0), dp(0), dp(0), dp(0));
        outer.addView(panel, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setOrientation(LinearLayout.HORIZONTAL);
        panel.addView(header, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        ImageView icon = new ImageView(this);
        icon.setImageResource(R.mipmap.ic_launcher);
        icon.setAdjustViewBounds(true);
        icon.setScaleType(ImageView.ScaleType.FIT_CENTER);
        LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(dp(48), dp(48));
        header.addView(icon, iconParams);

        TextView spacer = new TextView(this);
        header.addView(spacer, new LinearLayout.LayoutParams(0, 1, 1));

        TextView infoButton = iconButton("i");
        infoButton.setContentDescription("Pairing instructions");
        header.addView(infoButton, new LinearLayout.LayoutParams(dp(44), dp(44)));

        TextView title = text("Phone Sync", 28, COLOR_TEXT, Typeface.BOLD);
        addWithTopMargin(panel, title, 22);

        TextView subtitle = text("Connect to the Phone URL from Fauna Desktop.", 14, COLOR_MUTED, 0);
        subtitle.setLineSpacing(dp(2), 1.0f);
        addWithTopMargin(panel, subtitle, 5);

        Button scanButton = actionButton("Scan QR with camera", false);
        addWithTopMargin(panel, scanButton, 22);

        addWithTopMargin(panel, label("Phone URL"), 28);
        serverInput = input("http://192.168.1.20:8899", prefs.getString(SERVER_URL_KEY, ""));
        serverInput.setInputType(InputType.TYPE_TEXT_VARIATION_URI);
        addWithTopMargin(panel, serverInput, 7);

        addWithTopMargin(panel, label("Token"), 14);
        tokenInput = input("Paste token", prefs.getString(TOKEN_KEY, ""));
        tokenInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
        addWithTopMargin(panel, tokenInput, 7);

        Button connectButton = actionButton("Connect to PC", true);
        addWithTopMargin(panel, connectButton, 18);

        TextView clearButton = text("Clear saved pairing", 13, COLOR_DIM, Typeface.BOLD);
        clearButton.setGravity(Gravity.CENTER);
        clearButton.setMinHeight(dp(42));
        clearButton.setVisibility((prefs.getString(SERVER_URL_KEY, "").isEmpty() && prefs.getString(TOKEN_KEY, "").isEmpty()) ? View.GONE : View.VISIBLE);
        addWithTopMargin(panel, clearButton, 8);

        statusText = text(message, 13, COLOR_MUTED, 0);
        statusText.setLineSpacing(dp(2), 1.0f);
        addWithTopMargin(panel, statusText, 12);

        infoButton.setOnClickListener(view -> showInstructionsDialog());
        scanButton.setOnClickListener(view -> startQrScanner());

        connectButton.setOnClickListener(view -> {
            PairingDetails pairing = extractPairingDetails(
                serverInput.getText().toString(),
                tokenInput.getText().toString()
            );
            if (pairing.serverUrl.isEmpty() || pairing.token.isEmpty()) {
                statusText.setText("URL and token are required.");
                return;
            }
            serverInput.setText(pairing.serverUrl);
            tokenInput.setText(pairing.token);
            checkAndConnect(pairing.serverUrl, pairing.token, connectButton);
        });

        clearButton.setOnClickListener(view -> {
            prefs.edit().remove(SERVER_URL_KEY).remove(TOKEN_KEY).apply();
            WebStorage.getInstance().deleteAllData();
            serverInput.setText("");
            tokenInput.setText("");
            clearButton.setVisibility(View.GONE);
            statusText.setText("Saved pairing cleared.");
        });

        setContentView(scroll);
    }

    private void startQrScanner() {
        GmsBarcodeScannerOptions options = new GmsBarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
            .build();
        GmsBarcodeScanner scanner = GmsBarcodeScanning.getClient(this, options);
        if (statusText != null) statusText.setText("Opening camera...");
        scanner.startScan()
            .addOnSuccessListener(barcode -> {
                String rawValue = barcode.getRawValue();
                PairingDetails pairing = extractPairingDetails(rawValue, "");
                if (pairing.serverUrl.isEmpty() || pairing.token.isEmpty()) {
                    if (statusText != null) statusText.setText("QR code did not include a complete Fauna pairing.");
                    return;
                }
                if (serverInput != null) serverInput.setText(pairing.serverUrl);
                if (tokenInput != null) tokenInput.setText(pairing.token);
                checkAndConnect(pairing.serverUrl, pairing.token, null);
            })
            .addOnCanceledListener(() -> {
                if (statusText != null) statusText.setText("QR scan cancelled.");
            })
            .addOnFailureListener(error -> {
                if (statusText != null) statusText.setText("Could not open the camera scanner. Paste the pairing details instead.");
            });
    }

    private void showInstructionsDialog() {
        Dialog dialog = new Dialog(this);
        LinearLayout sheet = new LinearLayout(this);
        sheet.setOrientation(LinearLayout.VERTICAL);
        sheet.setPadding(dp(20), dp(18), dp(20), dp(18));
        sheet.setBackground(rounded(COLOR_PANEL, 18, COLOR_BORDER));

        TextView title = text("Pairing", 18, COLOR_TEXT, Typeface.BOLD);
        sheet.addView(title, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        TextView copy = text("Open Fauna Desktop settings, go to Phone Sync, then scan the QR code or copy the Phone URL and token here. The app loads a fresh mobile page from your PC every time.", 13, COLOR_MUTED, 0);
        copy.setLineSpacing(dp(3), 1.0f);
        addWithTopMargin(sheet, copy, 8);

        Button closeButton = actionButton("Done", false);
        addWithTopMargin(sheet, closeButton, 16);

        dialog.setContentView(sheet);
        closeButton.setOnClickListener(view -> dialog.dismiss());
        Window window = dialog.getWindow();
        dialog.setOnShowListener(item -> {
            Window shownWindow = dialog.getWindow();
            if (shownWindow == null) return;
            shownWindow.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            shownWindow.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        });
        if (window != null) {
            window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        }
        dialog.show();
    }

    private String firstNonEmpty(String first, String second) {
        String cleanFirst = first == null ? "" : first.trim();
        if (!cleanFirst.isEmpty()) return cleanFirst;
        return second == null ? "" : second.trim();
    }

    private boolean handlePairingIntent(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        if (data == null) return false;
        if (!"fauna".equalsIgnoreCase(data.getScheme()) || !"pair".equalsIgnoreCase(data.getHost())) return false;

        PairingDetails pairing = extractPairingDetails(
            firstNonEmpty(data.getQueryParameter("u"), data.getQueryParameter("url")),
            firstNonEmpty(data.getQueryParameter("t"), data.getQueryParameter("token"))
        );
        if (pairing.serverUrl.isEmpty() || pairing.token.isEmpty()) {
            showConnectionForm("The QR code did not include a complete Fauna pairing.");
            return true;
        }
        showConnectionForm("Checking pairing...");
        if (serverInput != null) serverInput.setText(pairing.serverUrl);
        if (tokenInput != null) tokenInput.setText(pairing.token);
        checkAndConnect(pairing.serverUrl, pairing.token, null);
        return true;
    }

    private String normalizeServerUrl(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (value.isEmpty()) return "";
        if (!value.startsWith("http://") && !value.startsWith("https://")) {
            value = "http://" + value;
        }
        int hashIndex = value.indexOf('#');
        if (hashIndex >= 0) {
            value = value.substring(0, hashIndex);
        }
        int queryIndex = value.indexOf('?');
        if (queryIndex >= 0) {
            value = value.substring(0, queryIndex);
        }
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }
        if (value.endsWith("/mobile")) {
            value = value.substring(0, value.length() - "/mobile".length());
        }
        return value;
    }

    private String firstRegexGroup(String text, String expression) {
        Matcher matcher = Pattern.compile(expression, Pattern.CASE_INSENSITIVE | Pattern.MULTILINE).matcher(text == null ? "" : text);
        return matcher.find() ? matcher.group(1).trim() : "";
    }

    private String trimPastedValue(String value) {
        return (value == null ? "" : value.trim())
            .replaceAll("[\\s<>\"']+$", "")
            .replaceAll("^[\\s<>\"']+", "");
    }

    private PairingDetails parsePairingUri(String value) {
        String clean = trimPastedValue(value);
        if (clean.isEmpty()) return null;
        try {
            Uri uri = Uri.parse(clean);
            if ("fauna".equalsIgnoreCase(uri.getScheme()) && "pair".equalsIgnoreCase(uri.getHost())) {
                return new PairingDetails(
                    normalizeServerUrl(firstNonEmpty(uri.getQueryParameter("u"), uri.getQueryParameter("url"))),
                    firstNonEmpty(uri.getQueryParameter("t"), uri.getQueryParameter("token"))
                );
            }
            String fragment = uri.getFragment();
            String fragmentToken = getParamFromQueryLikeString(fragment, "token");
            if (fragmentToken.isEmpty()) fragmentToken = getParamFromQueryLikeString(fragment, "t");
            if (!fragmentToken.isEmpty()) {
                return new PairingDetails(normalizeServerUrl(clean), fragmentToken);
            }
        } catch (Exception ignored) {
            return null;
        }
        return null;
    }

    private String getParamFromQueryLikeString(String value, String key) {
        if (value == null || value.isEmpty()) return "";
        for (String part : value.split("&")) {
            int equals = part.indexOf('=');
            if (equals <= 0) continue;
            String partKey = Uri.decode(part.substring(0, equals)).trim();
            if (key.equalsIgnoreCase(partKey)) return Uri.decode(part.substring(equals + 1)).trim();
        }
        return "";
    }

    private PairingDetails extractPairingDetails(String urlText, String tokenText) {
        String combined = (urlText == null ? "" : urlText) + "\n" + (tokenText == null ? "" : tokenText);
        String deepLink = firstRegexGroup(combined, "(fauna://pair\\?\\S+)");
        PairingDetails fromDeepLink = parsePairingUri(deepLink);
        if (fromDeepLink != null && !fromDeepLink.serverUrl.isEmpty() && !fromDeepLink.token.isEmpty()) return fromDeepLink;

        PairingDetails fromUrl = parsePairingUri(urlText);
        if (fromUrl != null && (!fromUrl.serverUrl.isEmpty() || !fromUrl.token.isEmpty())) {
            return new PairingDetails(
                firstNonEmpty(fromUrl.serverUrl, normalizeServerUrl(urlText)),
                firstNonEmpty(fromUrl.token, tokenText)
            );
        }

        String pastedUrl = firstRegexGroup(combined, "^\\s*(?:phone\\s+url|url)\\s*:\\s*(\\S+)");
        if (pastedUrl.isEmpty()) pastedUrl = firstRegexGroup(combined, "(https?://\\S+)");
        String pastedToken = firstRegexGroup(combined, "^\\s*token\\s*:\\s*(\\S+)");

        return new PairingDetails(
            normalizeServerUrl(firstNonEmpty(pastedUrl, urlText)),
            trimPastedValue(firstNonEmpty(pastedToken, tokenText))
        );
    }

    private String encodeUrlPart(String value) {
        try {
            return URLEncoder.encode(value, "UTF-8");
        } catch (Exception ignored) {
            return "";
        }
    }

    private String getDeviceName() {
        String manufacturer = Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.trim();
        String model = Build.MODEL == null ? "" : Build.MODEL.trim();
        String combined = (manufacturer + " " + model).trim().replaceAll("\\s+", " ");
        return combined.isEmpty() ? "Android phone" : combined;
    }

    private String getFaunaDeviceId() {
        String existing = prefs.getString(DEVICE_ID_KEY, "");
        if (existing != null && !existing.trim().isEmpty()) return existing.trim();
        String created = "android-" + UUID.randomUUID().toString();
        prefs.edit().putString(DEVICE_ID_KEY, created).apply();
        return created;
    }

    private void savePairing(String serverUrl, String token) {
        prefs.edit()
            .putString(SERVER_URL_KEY, serverUrl)
            .putString(TOKEN_KEY, token)
            .apply();
    }

    private void checkAndConnect(String serverUrl, String token, Button connectButton) {
        if (statusText != null) statusText.setText("Checking connection...");
        if (connectButton != null) connectButton.setEnabled(false);

        new Thread(() -> {
            ConnectionResult result = checkRemoteHealth(serverUrl, token);
            runOnUiThread(() -> {
                if (connectButton != null) connectButton.setEnabled(true);
                if (!result.ok) {
                    if (statusText != null) statusText.setText(result.message);
                    return;
                }
                savePairing(serverUrl, token);
                loadRemoteUi(serverUrl, token);
            });
        }).start();
    }

    private ConnectionResult checkRemoteHealth(String serverUrl, String token) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(normalizeServerUrl(serverUrl) + "/api/health");
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(6500);
            connection.setReadTimeout(6500);
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Authorization", "Bearer " + token);
            connection.setRequestProperty("X-Fauna-Device-Id", getFaunaDeviceId());
            connection.setRequestProperty("X-Fauna-Device-Name", getDeviceName());
            connection.setRequestProperty("X-Fauna-Device-Platform", "android");

            int code = connection.getResponseCode();
            if (code >= 200 && code < 300) return new ConnectionResult(true, "");
            if (code == 401) return new ConnectionResult(false, "Token was rejected. Copy the current token from Phone Sync again.");
            if (code == 403) return new ConnectionResult(false, "This phone is blocked in Fauna Desktop settings.");
            String body = readResponseSnippet(connection);
            return new ConnectionResult(false, body.isEmpty() ? "PC answered with HTTP " + code + "." : body);
        } catch (Exception error) {
            return new ConnectionResult(false, "Could not reach the PC. Make sure both devices are on the same Wi-Fi and Phone Sync is enabled.");
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private String readResponseSnippet(HttpURLConnection connection) {
        try {
            InputStream stream = connection.getErrorStream();
            if (stream == null) stream = connection.getInputStream();
            if (stream == null) return "";
            byte[] buffer = new byte[240];
            int length = stream.read(buffer);
            stream.close();
            if (length <= 0) return "";
            String text = new String(buffer, 0, length).replaceAll("\\s+", " ").trim();
            if (text.contains("\"error\"")) {
                String message = text.replaceAll("^.*\"error\"\\s*:\\s*\"([^\"]+)\".*$", "$1");
                if (!message.equals(text)) return message;
            }
            return text;
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
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        webView.clearCache(true);
        webView.clearFormData();

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;
                try {
                    Intent intent = params != null ? params.createIntent() : new Intent(Intent.ACTION_GET_CONTENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    startActivityForResult(Intent.createChooser(intent, "Choose files"), FILE_CHOOSER_REQUEST_CODE);
                    return true;
                } catch (Exception error) {
                    filePathCallback = null;
                    callback.onReceiveValue(null);
                    return false;
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse response = serveBundledMobileAsset(request);
                return response != null ? response : super.shouldInterceptRequest(view, request);
            }

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
        String encodedDeviceId = encodeUrlPart(getFaunaDeviceId());
        String encodedDeviceName = encodeUrlPart(getDeviceName());
        String cacheBust = String.valueOf(System.currentTimeMillis());
        webView.loadUrl(normalizeServerUrl(serverUrl) + "/mobile/?native=android&shell=0.3.2&ts=" + cacheBust + "#token=" + encodedToken + "&deviceId=" + encodedDeviceId + "&deviceName=" + encodedDeviceName + "&platform=android");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST_CODE || filePathCallback == null) return;
        Uri[] results = null;
        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                results = new Uri[count];
                for (int index = 0; index < count; index += 1) {
                    results[index] = data.getClipData().getItemAt(index).getUri();
                }
            } else if (data.getData() != null) {
                results = new Uri[] { data.getData() };
            }
        }
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    private WebResourceResponse serveBundledMobileAsset(WebResourceRequest request) {
        Uri uri = request == null ? null : request.getUrl();
        String path = uri == null ? "" : uri.getPath();
        String assetPath = getBundledMobileAssetPath(path);
        if (assetPath.isEmpty()) return null;
        try {
            InputStream stream = getAssets().open(assetPath);
            WebResourceResponse response = new WebResourceResponse(getBundledMimeType(assetPath), "UTF-8", stream);
            response.setResponseHeaders(java.util.Collections.singletonMap("Cache-Control", "no-store"));
            return response;
        } catch (Exception ignored) {
            return null;
        }
    }

    private String getBundledMobileAssetPath(String path) {
        String clean = path == null ? "" : path;
        if (clean.equals("/mobile") || clean.equals("/mobile/") || clean.equals("/mobile/index.html")) return "mobile/index.html";
        if (clean.equals("/mobile/app.js")) return "mobile/app.js";
        if (clean.equals("/mobile/styles.css")) return "mobile/styles.css";
        if (clean.equals("/styles.css")) return "styles.css";
        if (clean.startsWith("/styles/")) return clean.substring(1);
        if (clean.equals("/components/composer.html")) return "components/composer.html";
        if (clean.equals("/components/templates.html")) return "components/templates.html";
        if (clean.equals("/modules/model-switcher.js")) return "modules/model-switcher.js";
        if (clean.equals("/favicon.png")) return "favicon.png";
        return "";
    }

    private String getBundledMimeType(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".js")) return "text/javascript";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
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

    private static class PairingDetails {
        final String serverUrl;
        final String token;

        PairingDetails(String serverUrl, String token) {
            this.serverUrl = serverUrl == null ? "" : serverUrl.trim();
            this.token = token == null ? "" : token.trim();
        }
    }

    private static class ConnectionResult {
        final boolean ok;
        final String message;

        ConnectionResult(boolean ok, String message) {
            this.ok = ok;
            this.message = message == null ? "" : message;
        }
    }
}
