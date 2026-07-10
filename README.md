# Fauna

Fauna is a local-first AI workspace for Ollama and optional hosted providers. It includes a static web UI, an Electron desktop shell, and an Android Phone Sync companion for chats, attachments, settings, and remote prompts.

## Run the web app

The web core has no bundler or framework build step:

```powershell
python -m http.server 5173 --bind 127.0.0.1
```

Open `http://127.0.0.1:5173/`. Use another local port if `5173` is occupied.

## Desktop app

Install the desktop dependencies once and start Electron:

```powershell
npm install
npm run desktop
```

Build Windows distribution artifacts only when preparing a release:

```powershell
npm run desktop:build
```

Desktop settings live under `%AppData%\Fauna`. Chats are stored under `%AppData%\Fauna\chats\<chatId>`, with generated media and agent output inside each chat directory. The Local Workspace Bridge is opt-in; the desktop app no longer starts it unless it was explicitly enabled.

## Phone Sync

In Fauna Desktop, open **Settings > Phone Sync** and enable **Android remote access**. The desktop app starts a token-protected Phone Sync server and shows:

- a private-LAN Phone URL;
- a secret pairing token;
- a QR code for the Android companion;
- connected phones with online, blocked, and last-seen state.

The LAN URL uses HTTP because it is restricted to the local network. The Android app rejects public HTTP URLs and accepts HTTP only for private/local hosts.

### Access while away from home

Phone Sync offers two opt-in HTTPS modes:

1. **Quick Tunnel** starts the locally installed `cloudflared` executable and creates a temporary `trycloudflare.com` URL. Install `cloudflared` yourself and make it available on `PATH`; Fauna never installs it silently. The URL can change whenever the tunnel restarts, so rescan or update the Android profile when needed.
2. **Custom HTTPS** advertises a stable public origin supplied by you, such as a correctly configured Cloudflare Tunnel, Tailscale Funnel, or trusted reverse proxy. The value must be a public, origin-only HTTPS URL.

The public URL does not replace authentication. Every remote API request still requires the current Phone Sync token. Use **New token** immediately if a pairing link or private connection backup is exposed. Turning off Phone Sync or Internet access stops Fauna's Quick Tunnel process.

The Local Workspace Bridge is a separate localhost service and is never forwarded by Phone Sync. See [Phone Sync security and recovery](docs/PHONE_SYNC.md) for the detailed trust model.

## Android companion

The Android shell can keep up to 20 PC profiles. Scan a QR code or enter a PC name, Phone URL, and token, then switch PCs from the active-PC control in the mobile top bar or **Settings > Phone Sync**.

The connection manager supports:

- legacy migration from the previous single-PC pairing;
- LAN and valid public HTTPS profiles;
- add, update, switch, and remove;
- private JSON export/import for moving profiles to another phone.

The mobile composer model picker mirrors the connected PC's active provider and installed chat-capable Ollama models, including Hugging Face GGUF provenance and quantization. Switching there updates the desktop selection. If Ollama is offline or the active local model is missing or not chat-capable, Phone Sync rejects the send and restores the mobile draft instead of silently losing it.

Connection backups intentionally contain Phone Sync tokens. Treat them like passwords. Android platform backup is disabled so these credentials move only through an explicit private export.

Compile the Android Java sources from `android/`:

```powershell
.\gradlew.bat :app:compileDebugJavaWithJavac --no-daemon
```

## Settings transfer

Desktop **Settings > Info > Settings transfer** exports and imports a portable JSON backup. The Phone Sync mobile settings page can export/copy and import the same format.

Portable backups include preferences such as appearance, model choices, response controls, notifications, performance, and personalization. They deliberately exclude:

- chats and generated files;
- API keys and all tokens;
- workspace/project paths;
- Local Workspace Bridge configuration;
- machine-local service endpoints.

This portable format is different from the Android private connection backup.

## Local Workspace Bridge

Run the bridge only for a trusted root when local file or terminal access is needed:

```powershell
py -3 local-bridge.py --root . --port 8765
```

Copy the printed URL and token into **Settings > Local Services**, explicitly enable the bridge, and choose the narrowest suitable access scope. Keep it bound to `127.0.0.1`.

Useful prompts:

```text
/tree
/read script.js
/run git status --short
/web https://example.com
```

## Optional local services

- Ollama chat API: `http://localhost:11434/api/chat`
- ComfyUI/Wan video endpoint: `http://localhost:8188`
- Fauna workspace bridge: `http://127.0.0.1:8765`

Fauna can also call providers and public web services you configure. Review their terms and privacy policies before sending data.

### Hugging Face GGUF models

Open **Settings > AI Provider > Hugging Face GGUF** to pull a public GGUF repository through the local Ollama service. Enter either `owner/model-GGUF` or its `https://huggingface.co/owner/model-GGUF` repository URL, plus an optional quantization such as `Q4_K_M`. Fauna shows the final `hf.co/...` reference and asks for approval before downloading, then adds the installed model to the local catalog and selects it.

The in-app flow does not require or install the Hugging Face CLI and never accepts a Hugging Face token. Gated or private repositories need a separate authenticated/manual import. Check each model's license, compatibility, download size, and hardware requirements before use.

## License

Fauna is released under the MIT License.
