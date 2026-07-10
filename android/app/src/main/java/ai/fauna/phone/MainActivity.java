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
import android.window.OnBackInvokedCallback;
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

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.net.URLEncoder;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends Activity {
    private static final String PREFS_NAME = "fauna_phone";
    private static final String SERVER_URL_KEY = "server_url";
    private static final String TOKEN_KEY = "token";
    private static final String DEVICE_ID_KEY = "device_id";
    private static final String CONNECTION_PROFILES_KEY = "connection_profiles_v1";
    private static final String ACTIVE_PROFILE_ID_KEY = "active_profile_id";
    private static final String CONNECTION_BACKUP_SCHEMA = "fauna-phone-connections";
    private static final int CONNECTION_BACKUP_VERSION = 1;
    private static final int MAX_CONNECTION_PROFILES = 20;
    private static final int MAX_CONNECTION_BACKUP_BYTES = 1024 * 1024;
    private static final int FILE_CHOOSER_REQUEST_CODE = 42;
    private static final int EXPORT_CONNECTIONS_REQUEST_CODE = 43;
    private static final int IMPORT_CONNECTIONS_REQUEST_CODE = 44;
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
    private EditText profileNameInput;
    private EditText serverInput;
    private EditText tokenInput;
    private TextView statusText;
    private ValueCallback<Uri[]> filePathCallback;
    private OnBackInvokedCallback backInvokedCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemBarsWindow();
        registerPredictiveBackCallback();
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        migrateLegacyPairingIfNeeded();
        if (handlePairingIntent(getIntent())) return;

        ConnectionProfile activeProfile = getActiveProfile();
        if (activeProfile != null) {
            loadRemoteUi(activeProfile.serverUrl, activeProfile.token, activeProfile.name);
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

    private void registerPredictiveBackCallback() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return;
        backInvokedCallback = this::handleBackNavigation;
        getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
            android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
            backInvokedCallback
        );
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

    private String cleanProfileName(String value, String serverUrl) {
        String clean = value == null ? "" : value.trim().replaceAll("\\s+", " ");
        if (clean.isEmpty()) {
            try {
                clean = Uri.parse(serverUrl).getHost();
            } catch (Exception ignored) {
                clean = "";
            }
        }
        if (clean == null || clean.trim().isEmpty()) clean = "Fauna PC";
        clean = clean.trim();
        return clean.length() > 80 ? clean.substring(0, 80) : clean;
    }

    private boolean isPrivateLanHost(String rawHost) {
        String host = rawHost == null ? "" : rawHost.trim().toLowerCase(Locale.ROOT);
        if (host.startsWith("[") && host.endsWith("]")) host = host.substring(1, host.length() - 1);
        if (host.isEmpty()) return false;
        if (host.equals("localhost") || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".lan") || !host.contains(".")) return true;
        if (host.equals("::1") || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb")) return true;
        String[] parts = host.split("\\.");
        if (parts.length != 4) return false;
        try {
            int first = Integer.parseInt(parts[0]);
            int second = Integer.parseInt(parts[1]);
            return first == 10
                || first == 127
                || (first == 169 && second == 254)
                || (first == 172 && second >= 16 && second <= 31)
                || (first == 192 && second == 168);
        } catch (NumberFormatException ignored) {
            return false;
        }
    }

    private boolean isAllowedServerUrl(String serverUrl) {
        try {
            Uri uri = Uri.parse(normalizeServerUrl(serverUrl));
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            String host = uri.getHost();
            String path = uri.getPath() == null ? "" : uri.getPath();
            if (uri.getUserInfo() != null || (!path.isEmpty() && !"/".equals(path))) return false;
            if ("https".equals(scheme)) return host != null && !host.trim().isEmpty();
            return "http".equals(scheme) && isPrivateLanHost(host);
        } catch (Exception ignored) {
            return false;
        }
    }

    private List<ConnectionProfile> loadConnectionProfiles() {
        List<ConnectionProfile> profiles = new ArrayList<>();
        try {
            JSONArray raw = new JSONArray(prefs.getString(CONNECTION_PROFILES_KEY, "[]"));
            for (int index = 0; index < raw.length() && profiles.size() < MAX_CONNECTION_PROFILES; index += 1) {
                JSONObject item = raw.optJSONObject(index);
                if (item == null) continue;
                String serverUrl = normalizeServerUrl(item.optString("serverUrl", ""));
                String token = item.optString("token", "").trim();
                if (!isAllowedServerUrl(serverUrl) || token.isEmpty() || token.length() > 512) continue;
                String id = item.optString("id", "").trim();
                if (id.isEmpty() || id.length() > 96) id = "pc-" + UUID.randomUUID();
                profiles.add(new ConnectionProfile(
                    id,
                    cleanProfileName(item.optString("name", ""), serverUrl),
                    serverUrl,
                    token
                ));
            }
        } catch (Exception ignored) {
            return new ArrayList<>();
        }
        return profiles;
    }

    private void saveConnectionProfiles(List<ConnectionProfile> profiles, String activeProfileId) {
        JSONArray raw = new JSONArray();
        for (ConnectionProfile profile : profiles) {
            if (raw.length() >= MAX_CONNECTION_PROFILES) break;
            try {
                JSONObject item = new JSONObject();
                item.put("id", profile.id);
                item.put("name", profile.name);
                item.put("serverUrl", profile.serverUrl);
                item.put("token", profile.token);
                raw.put(item);
            } catch (Exception ignored) {
                // Skip malformed profiles instead of damaging the remaining list.
            }
        }

        ConnectionProfile active = null;
        for (ConnectionProfile profile : profiles) {
            if (profile.id.equals(activeProfileId)) {
                active = profile;
                break;
            }
        }
        if (active == null && !profiles.isEmpty()) active = profiles.get(0);

        SharedPreferences.Editor editor = prefs.edit()
            .putString(CONNECTION_PROFILES_KEY, raw.toString())
            .putString(ACTIVE_PROFILE_ID_KEY, active == null ? "" : active.id);
        if (active == null) {
            editor.remove(SERVER_URL_KEY).remove(TOKEN_KEY);
        } else {
            editor.putString(SERVER_URL_KEY, active.serverUrl).putString(TOKEN_KEY, active.token);
        }
        editor.apply();
    }

    private void migrateLegacyPairingIfNeeded() {
        if (prefs.contains(CONNECTION_PROFILES_KEY)) return;
        String serverUrl = normalizeServerUrl(prefs.getString(SERVER_URL_KEY, ""));
        String token = prefs.getString(TOKEN_KEY, "").trim();
        List<ConnectionProfile> profiles = new ArrayList<>();
        String activeId = "";
        if (isAllowedServerUrl(serverUrl) && !token.isEmpty()) {
            ConnectionProfile profile = new ConnectionProfile(
                "pc-" + UUID.randomUUID(),
                cleanProfileName("", serverUrl),
                serverUrl,
                token
            );
            profiles.add(profile);
            activeId = profile.id;
        }
        saveConnectionProfiles(profiles, activeId);
    }

    private ConnectionProfile getActiveProfile() {
        List<ConnectionProfile> profiles = loadConnectionProfiles();
        String activeId = prefs.getString(ACTIVE_PROFILE_ID_KEY, "");
        for (ConnectionProfile profile : profiles) {
            if (profile.id.equals(activeId)) return profile;
        }
        return profiles.isEmpty() ? null : profiles.get(0);
    }

    private ConnectionProfile upsertConnectionProfile(String name, String serverUrl, String token) {
        List<ConnectionProfile> profiles = loadConnectionProfiles();
        String normalizedUrl = normalizeServerUrl(serverUrl);
        ConnectionProfile updated = null;
        for (int index = 0; index < profiles.size(); index += 1) {
            ConnectionProfile existing = profiles.get(index);
            if (!existing.serverUrl.equalsIgnoreCase(normalizedUrl)) continue;
            updated = new ConnectionProfile(existing.id, cleanProfileName(name, normalizedUrl), normalizedUrl, token.trim());
            profiles.set(index, updated);
            break;
        }
        if (updated == null) {
            if (profiles.size() >= MAX_CONNECTION_PROFILES) throw new IllegalStateException("Remove a saved PC before adding another one.");
            updated = new ConnectionProfile("pc-" + UUID.randomUUID(), cleanProfileName(name, normalizedUrl), normalizedUrl, token.trim());
            profiles.add(0, updated);
        }
        saveConnectionProfiles(profiles, updated.id);
        return updated;
    }

    private void removeConnectionProfile(String profileId) {
        List<ConnectionProfile> profiles = loadConnectionProfiles();
        List<ConnectionProfile> next = new ArrayList<>();
        for (ConnectionProfile profile : profiles) {
            if (!profile.id.equals(profileId)) next.add(profile);
        }
        String currentActive = prefs.getString(ACTIVE_PROFILE_ID_KEY, "");
        String nextActive = profileId.equals(currentActive) && !next.isEmpty() ? next.get(0).id : currentActive;
        saveConnectionProfiles(next, nextActive);
        WebStorage.getInstance().deleteAllData();
    }

    private View createConnectionProfileCard(ConnectionProfile profile) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(12), dp(11), dp(12), dp(11));
        card.setBackground(rounded(COLOR_PANEL, 10, COLOR_BORDER));

        LinearLayout top = new LinearLayout(this);
        top.setOrientation(LinearLayout.HORIZONTAL);
        top.setGravity(Gravity.CENTER_VERTICAL);
        TextView copy = text(profile.name + "\n" + profile.serverUrl, 14, COLOR_TEXT, Typeface.BOLD);
        copy.setLineSpacing(dp(2), 1.0f);
        top.addView(copy, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        if (profile.id.equals(prefs.getString(ACTIVE_PROFILE_ID_KEY, ""))) {
            TextView active = text("Active", 11, COLOR_ACCENT, Typeface.BOLD);
            active.setPadding(dp(8), dp(4), dp(8), dp(4));
            active.setBackground(rounded(0x1A5B7CFA, 999, 0x335B7CFA));
            top.addView(active);
        }
        card.addView(top, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.setGravity(Gravity.END);
        Button connect = actionButton("Connect", false);
        Button remove = actionButton("Remove", false);
        actions.addView(connect, new LinearLayout.LayoutParams(0, dp(42), 1));
        LinearLayout.LayoutParams removeParams = new LinearLayout.LayoutParams(0, dp(42), 1);
        removeParams.leftMargin = dp(8);
        actions.addView(remove, removeParams);
        addWithTopMargin(card, actions, 10);

        copy.setOnClickListener(view -> {
            if (profileNameInput != null) profileNameInput.setText(profile.name);
            if (serverInput != null) serverInput.setText(profile.serverUrl);
            if (tokenInput != null) tokenInput.setText(profile.token);
        });
        connect.setOnClickListener(view -> checkAndConnect(profile.serverUrl, profile.token, profile.name, connect));
        remove.setOnClickListener(view -> showRemoveConnectionDialog(profile));
        return card;
    }

    private void showRemoveConnectionDialog(ConnectionProfile profile) {
        Dialog dialog = new Dialog(this);
        LinearLayout sheet = new LinearLayout(this);
        sheet.setOrientation(LinearLayout.VERTICAL);
        sheet.setPadding(dp(20), dp(18), dp(20), dp(18));
        sheet.setBackground(rounded(COLOR_PANEL, 18, COLOR_BORDER));
        sheet.addView(text("Remove " + profile.name + "?", 18, COLOR_TEXT, Typeface.BOLD));
        TextView copy = text("The saved URL and Phone Sync token will be deleted from this phone.", 13, COLOR_MUTED, 0);
        copy.setLineSpacing(dp(3), 1.0f);
        addWithTopMargin(sheet, copy, 8);
        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        Button cancel = actionButton("Cancel", false);
        Button remove = actionButton("Remove", true);
        actions.addView(cancel, new LinearLayout.LayoutParams(0, dp(46), 1));
        LinearLayout.LayoutParams removeParams = new LinearLayout.LayoutParams(0, dp(46), 1);
        removeParams.leftMargin = dp(8);
        actions.addView(remove, removeParams);
        addWithTopMargin(sheet, actions, 16);
        dialog.setContentView(sheet);
        cancel.setOnClickListener(view -> dialog.dismiss());
        remove.setOnClickListener(view -> {
            removeConnectionProfile(profile.id);
            dialog.dismiss();
            showConnectionForm("Saved PC removed.");
        });
        dialog.setOnShowListener(item -> {
            Window window = dialog.getWindow();
            if (window == null) return;
            window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        });
        dialog.show();
    }

    private void showConnectionForm(String message) {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        ConnectionProfile activeProfile = getActiveProfile();
        List<ConnectionProfile> profiles = loadConnectionProfiles();

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

        TextView subtitle = text("Switch between several Fauna PCs, on your LAN or through a secure HTTPS tunnel.", 14, COLOR_MUTED, 0);
        subtitle.setLineSpacing(dp(2), 1.0f);
        addWithTopMargin(panel, subtitle, 5);

        if (!profiles.isEmpty()) {
            addWithTopMargin(panel, label("SAVED PCS"), 24);
            for (ConnectionProfile profile : profiles) {
                addWithTopMargin(panel, createConnectionProfileCard(profile), 8);
            }
        }

        Button scanButton = actionButton("Scan QR with camera", false);
        addWithTopMargin(panel, scanButton, 22);

        addWithTopMargin(panel, label("PC NAME"), 24);
        profileNameInput = input("Home PC", activeProfile == null ? "" : activeProfile.name);
        addWithTopMargin(panel, profileNameInput, 7);

        addWithTopMargin(panel, label("Phone URL"), 28);
        serverInput = input("http://192.168.1.20:8899", activeProfile == null ? "" : activeProfile.serverUrl);
        serverInput.setInputType(InputType.TYPE_TEXT_VARIATION_URI);
        addWithTopMargin(panel, serverInput, 7);

        addWithTopMargin(panel, label("Token"), 14);
        tokenInput = input("Paste token", activeProfile == null ? "" : activeProfile.token);
        tokenInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        addWithTopMargin(panel, tokenInput, 7);

        Button connectButton = actionButton("Connect to PC", true);
        addWithTopMargin(panel, connectButton, 18);

        LinearLayout transferActions = new LinearLayout(this);
        transferActions.setOrientation(LinearLayout.HORIZONTAL);
        Button exportButton = actionButton("Export private backup", false);
        Button importButton = actionButton("Import backup", false);
        transferActions.addView(exportButton, new LinearLayout.LayoutParams(0, dp(46), 1));
        LinearLayout.LayoutParams importParams = new LinearLayout.LayoutParams(0, dp(46), 1);
        importParams.leftMargin = dp(8);
        transferActions.addView(importButton, importParams);
        addWithTopMargin(panel, transferActions, 10);

        TextView transferHint = text("Private connection backups contain Phone Sync tokens. Store and share them like passwords.", 12, COLOR_DIM, 0);
        transferHint.setLineSpacing(dp(2), 1.0f);
        addWithTopMargin(panel, transferHint, 8);

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
            if (!isAllowedServerUrl(pairing.serverUrl)) {
                statusText.setText("Use HTTPS outside your LAN. HTTP is accepted only for private local addresses.");
                return;
            }
            serverInput.setText(pairing.serverUrl);
            tokenInput.setText(pairing.token);
            String profileName = firstNonEmpty(profileNameInput.getText().toString(), pairing.name);
            checkAndConnect(pairing.serverUrl, pairing.token, profileName, connectButton);
        });

        exportButton.setOnClickListener(view -> showExportConnectionsDialog());
        importButton.setOnClickListener(view -> startImportConnections());

        setContentView(scroll);
    }

    private JSONObject createConnectionsBackup() throws Exception {
        JSONObject backup = new JSONObject();
        backup.put("schema", CONNECTION_BACKUP_SCHEMA);
        backup.put("version", CONNECTION_BACKUP_VERSION);
        backup.put("exportedAt", System.currentTimeMillis());
        backup.put("sensitive", true);
        backup.put("activeProfileId", prefs.getString(ACTIVE_PROFILE_ID_KEY, ""));
        JSONArray profiles = new JSONArray();
        for (ConnectionProfile profile : loadConnectionProfiles()) {
            JSONObject item = new JSONObject();
            item.put("id", profile.id);
            item.put("name", profile.name);
            item.put("serverUrl", profile.serverUrl);
            item.put("token", profile.token);
            profiles.put(item);
        }
        backup.put("profiles", profiles);
        return backup;
    }

    private void showExportConnectionsDialog() {
        if (loadConnectionProfiles().isEmpty()) {
            if (statusText != null) statusText.setText("There are no saved PCs to export.");
            return;
        }
        Dialog dialog = new Dialog(this);
        LinearLayout sheet = new LinearLayout(this);
        sheet.setOrientation(LinearLayout.VERTICAL);
        sheet.setPadding(dp(20), dp(18), dp(20), dp(18));
        sheet.setBackground(rounded(COLOR_PANEL, 18, COLOR_BORDER));
        sheet.addView(text("Export private connection backup?", 18, COLOR_TEXT, Typeface.BOLD));
        TextView copy = text("This JSON file contains every saved Phone Sync URL and token. Anyone who has it may access those PCs while the tokens remain valid.", 13, COLOR_MUTED, 0);
        copy.setLineSpacing(dp(3), 1.0f);
        addWithTopMargin(sheet, copy, 8);
        LinearLayout actions = new LinearLayout(this);
        Button cancel = actionButton("Cancel", false);
        Button export = actionButton("Export private file", true);
        actions.addView(cancel, new LinearLayout.LayoutParams(0, dp(46), 1));
        LinearLayout.LayoutParams exportParams = new LinearLayout.LayoutParams(0, dp(46), 1);
        exportParams.leftMargin = dp(8);
        actions.addView(export, exportParams);
        addWithTopMargin(sheet, actions, 16);
        dialog.setContentView(sheet);
        cancel.setOnClickListener(view -> dialog.dismiss());
        export.setOnClickListener(view -> {
            dialog.dismiss();
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");
            intent.putExtra(Intent.EXTRA_TITLE, "Fauna-private-connections.json");
            startActivityForResult(intent, EXPORT_CONNECTIONS_REQUEST_CODE);
        });
        dialog.setOnShowListener(item -> {
            Window window = dialog.getWindow();
            if (window == null) return;
            window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        });
        dialog.show();
    }

    private void startImportConnections() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        startActivityForResult(intent, IMPORT_CONNECTIONS_REQUEST_CODE);
    }

    private byte[] readDocumentBytes(Uri uri, int maxBytes) throws Exception {
        InputStream stream = getContentResolver().openInputStream(uri);
        if (stream == null) throw new IllegalArgumentException("Could not open the selected backup.");
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int total = 0;
            int count;
            while ((count = stream.read(buffer)) != -1) {
                total += count;
                if (total > maxBytes) throw new IllegalArgumentException("The connection backup must be smaller than 1 MB.");
                output.write(buffer, 0, count);
            }
            return output.toByteArray();
        } finally {
            stream.close();
        }
    }

    private int importConnectionsBackup(Uri uri) throws Exception {
        String json = new String(readDocumentBytes(uri, MAX_CONNECTION_BACKUP_BYTES), StandardCharsets.UTF_8);
        JSONObject backup = new JSONObject(json);
        if (!CONNECTION_BACKUP_SCHEMA.equals(backup.optString("schema")) || backup.optInt("version", 0) != CONNECTION_BACKUP_VERSION) {
            throw new IllegalArgumentException("This is not a supported Fauna Phone connection backup.");
        }
        JSONArray incoming = backup.optJSONArray("profiles");
        if (incoming == null) throw new IllegalArgumentException("The connection backup does not contain any PC profiles.");

        List<ConnectionProfile> merged = loadConnectionProfiles();
        int imported = 0;
        String firstImportedId = "";
        for (int index = 0; index < incoming.length(); index += 1) {
            JSONObject item = incoming.optJSONObject(index);
            if (item == null) continue;
            String serverUrl = normalizeServerUrl(item.optString("serverUrl", ""));
            String token = item.optString("token", "").trim();
            if (!isAllowedServerUrl(serverUrl) || token.isEmpty() || token.length() > 512) continue;
            String name = cleanProfileName(item.optString("name", ""), serverUrl);
            int existingIndex = -1;
            for (int cursor = 0; cursor < merged.size(); cursor += 1) {
                if (merged.get(cursor).serverUrl.equalsIgnoreCase(serverUrl)) {
                    existingIndex = cursor;
                    break;
                }
            }
            ConnectionProfile profile;
            if (existingIndex >= 0) {
                ConnectionProfile existing = merged.get(existingIndex);
                profile = new ConnectionProfile(existing.id, name, serverUrl, token);
                merged.set(existingIndex, profile);
            } else {
                if (merged.size() >= MAX_CONNECTION_PROFILES) continue;
                profile = new ConnectionProfile("pc-" + UUID.randomUUID(), name, serverUrl, token);
                merged.add(profile);
            }
            if (firstImportedId.isEmpty()) firstImportedId = profile.id;
            imported += 1;
        }
        if (imported == 0) throw new IllegalArgumentException("The backup contains no valid HTTPS or private-LAN PC profiles.");
        String activeId = prefs.getString(ACTIVE_PROFILE_ID_KEY, "");
        if (activeId.isEmpty()) activeId = firstImportedId;
        saveConnectionProfiles(merged, activeId);
        return imported;
    }

    private void writeConnectionsBackup(Uri uri) throws Exception {
        OutputStream stream = getContentResolver().openOutputStream(uri, "wt");
        if (stream == null) throw new IllegalArgumentException("Could not create the backup file.");
        try {
            stream.write((createConnectionsBackup().toString(2) + "\n").getBytes(StandardCharsets.UTF_8));
            stream.flush();
        } finally {
            stream.close();
        }
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
                if (profileNameInput != null && !pairing.name.isEmpty()) profileNameInput.setText(pairing.name);
                if (!isAllowedServerUrl(pairing.serverUrl)) {
                    if (statusText != null) statusText.setText("Use HTTPS outside your LAN. HTTP is accepted only for private local addresses.");
                    return;
                }
                checkAndConnect(pairing.serverUrl, pairing.token, pairing.name, null);
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
        pairing = new PairingDetails(
            pairing.serverUrl,
            pairing.token,
            firstNonEmpty(firstNonEmpty(data.getQueryParameter("n"), data.getQueryParameter("name")), pairing.name)
        );
        if (pairing.serverUrl.isEmpty() || pairing.token.isEmpty()) {
            showConnectionForm("The QR code did not include a complete Fauna pairing.");
            return true;
        }
        showConnectionForm("Checking pairing...");
        if (serverInput != null) serverInput.setText(pairing.serverUrl);
        if (tokenInput != null) tokenInput.setText(pairing.token);
        if (profileNameInput != null && !pairing.name.isEmpty()) profileNameInput.setText(pairing.name);
        if (!isAllowedServerUrl(pairing.serverUrl)) {
            if (statusText != null) statusText.setText("Use HTTPS outside your LAN. HTTP is accepted only for private local addresses.");
            return true;
        }
        checkAndConnect(pairing.serverUrl, pairing.token, pairing.name, null);
        return true;
    }

    private String normalizeServerUrl(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (value.isEmpty()) return "";
        String lowerValue = value.toLowerCase(Locale.ROOT);
        if (!lowerValue.startsWith("http://") && !lowerValue.startsWith("https://")) {
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
                    firstNonEmpty(uri.getQueryParameter("t"), uri.getQueryParameter("token")),
                    firstNonEmpty(uri.getQueryParameter("n"), uri.getQueryParameter("name"))
                );
            }
            String fragment = uri.getFragment();
            String fragmentToken = getParamFromQueryLikeString(fragment, "token");
            if (fragmentToken.isEmpty()) fragmentToken = getParamFromQueryLikeString(fragment, "t");
            if (!fragmentToken.isEmpty()) {
                return new PairingDetails(
                    normalizeServerUrl(clean),
                    fragmentToken,
                    firstNonEmpty(getParamFromQueryLikeString(fragment, "connectionName"), getParamFromQueryLikeString(fragment, "name"))
                );
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
                firstNonEmpty(fromUrl.token, tokenText),
                fromUrl.name
            );
        }

        String pastedUrl = firstRegexGroup(combined, "^\\s*(?:phone\\s+url|url)\\s*:\\s*(\\S+)");
        if (pastedUrl.isEmpty()) pastedUrl = firstRegexGroup(combined, "(https?://\\S+)");
        String pastedToken = firstRegexGroup(combined, "^\\s*token\\s*:\\s*(\\S+)");

        return new PairingDetails(
            normalizeServerUrl(firstNonEmpty(pastedUrl, urlText)),
            trimPastedValue(firstNonEmpty(pastedToken, tokenText)),
            ""
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

    private void checkAndConnect(String serverUrl, String token, String profileName, Button connectButton) {
        if (!isAllowedServerUrl(serverUrl)) {
            if (statusText != null) statusText.setText("Use HTTPS outside your LAN. HTTP is accepted only for private local addresses.");
            return;
        }
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
                try {
                    ConnectionProfile profile = upsertConnectionProfile(profileName, serverUrl, token);
                    loadRemoteUi(profile.serverUrl, profile.token, profile.name);
                } catch (Exception error) {
                    if (statusText != null) statusText.setText(error.getMessage());
                }
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
            return new ConnectionResult(false, "Could not reach the PC. Check the LAN connection or secure HTTPS tunnel, then confirm Phone Sync is enabled.");
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

    private boolean handleWebNavigation(Uri uri, String serverUrl) {
        if (uri == null) return false;
        if ("fauna".equalsIgnoreCase(uri.getScheme()) && ("connections".equalsIgnoreCase(uri.getHost()) || "manage".equalsIgnoreCase(uri.getHost()))) {
            runOnUiThread(() -> showConnectionForm("Choose or add a PC."));
            return true;
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!"http".equals(scheme) && !"https".equals(scheme)) return false;
        Uri allowed = Uri.parse(normalizeServerUrl(serverUrl));
        int requestPort = uri.getPort() >= 0 ? uri.getPort() : ("https".equals(scheme) ? 443 : 80);
        String allowedScheme = allowed.getScheme() == null ? "" : allowed.getScheme().toLowerCase(Locale.ROOT);
        int allowedPort = allowed.getPort() >= 0 ? allowed.getPort() : ("https".equals(allowedScheme) ? 443 : 80);
        boolean sameOrigin = scheme.equals(allowedScheme)
            && String.valueOf(uri.getHost()).equalsIgnoreCase(String.valueOf(allowed.getHost()))
            && requestPort == allowedPort;
        if (sameOrigin) return false;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) {
            // Leave the remote page in place when no external handler is available.
        }
        return true;
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void loadRemoteUi(String serverUrl, String token, String profileName) {
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(21, 23, 26));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setAllowFileAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
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
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleWebNavigation(request == null ? null : request.getUrl(), serverUrl);
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleWebNavigation(url == null ? null : Uri.parse(url), serverUrl);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse response = serveBundledMobileAsset(request);
                return response != null ? response : super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request != null && request.isForMainFrame()) {
                    showConnectionForm("Could not reach the PC. Check the LAN connection or HTTPS tunnel and the Phone Sync toggle.");
                }
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
                showConnectionForm("Secure connection failed. Use a valid HTTPS tunnel certificate or the private HTTP LAN URL shown by Fauna Desktop.");
            }
        });

        setContentView(webView);
        String encodedToken = encodeUrlPart(token);
        String encodedDeviceId = encodeUrlPart(getFaunaDeviceId());
        String encodedDeviceName = encodeUrlPart(getDeviceName());
        String encodedConnectionName = encodeUrlPart(cleanProfileName(profileName, serverUrl));
        String cacheBust = String.valueOf(System.currentTimeMillis());
        webView.loadUrl(normalizeServerUrl(serverUrl) + "/mobile/?native=android&shell=0.4.0&ts=" + cacheBust + "#token=" + encodedToken + "&deviceId=" + encodedDeviceId + "&deviceName=" + encodedDeviceName + "&platform=android&connectionName=" + encodedConnectionName);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == EXPORT_CONNECTIONS_REQUEST_CODE) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                try {
                    writeConnectionsBackup(data.getData());
                    showConnectionForm("Private connection backup exported.");
                } catch (Exception error) {
                    showConnectionForm("Export failed: " + error.getMessage());
                }
            }
            return;
        }
        if (requestCode == IMPORT_CONNECTIONS_REQUEST_CODE) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                try {
                    int imported = importConnectionsBackup(data.getData());
                    showConnectionForm(imported + (imported == 1 ? " PC imported." : " PCs imported."));
                } catch (Exception error) {
                    showConnectionForm("Import failed: " + error.getMessage());
                }
            }
            return;
        }
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

    private void handleBackNavigation() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        if (webView != null) {
            showConnectionForm("");
            return;
        }
        finishAfterTransition();
    }

    @Override
    @SuppressLint("GestureBackNavigation")
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        handleBackNavigation();
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && backInvokedCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backInvokedCallback);
            backInvokedCallback = null;
        }
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private static class PairingDetails {
        final String serverUrl;
        final String token;
        final String name;

        PairingDetails(String serverUrl, String token, String name) {
            this.serverUrl = serverUrl == null ? "" : serverUrl.trim();
            this.token = token == null ? "" : token.trim();
            this.name = name == null ? "" : name.trim();
        }
    }

    private static class ConnectionProfile {
        final String id;
        final String name;
        final String serverUrl;
        final String token;

        ConnectionProfile(String id, String name, String serverUrl, String token) {
            this.id = id == null ? "" : id.trim();
            this.name = name == null ? "Fauna PC" : name.trim();
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
