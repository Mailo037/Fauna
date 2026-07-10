# Agent Instructions

## Project Snapshot

Fauna AI has a dependency-free static web core plus Electron desktop and native Android shells. The web core has no bundler or framework build step; Electron and Android do have their own package/build tooling.

Primary files:

- `index.html`: DOM structure, controls, labels, inline suggestion prompts, and script/style links.
- `components/*.html`: app shell chunks and reusable DOM templates for custom UI primitives.
- `styles.css` and `styles/*.css`: theme tokens, responsive behavior, settings panes, chat UI, and component styling.
- `script.js` and `scripts/*.js`: ordered application behavior chunks for chat state, providers, tools, media, settings, voice, storage, and project workflows.
- `local-bridge.py`: optional dependency-free localhost bridge for workspace file reads and terminal commands.
- `modules/*.js`: focused browser modules for sidebar, theme, storage, lightbox, and custom select behavior.
- `electron/main.js` and `electron/preload.js`: desktop storage, native dialogs, bridge lifecycle, Phone Sync server, secure Internet tunnel lifecycle, updates, and the narrow renderer API.
- `mobile/*`: Phone Sync web UI served by the desktop endpoint.
- `android/app/src/main/java/.../MainActivity.java`: native Android connection profile manager, QR pairing, profile backup/import, and hardened WebView shell.
- `android/app/src/main/assets/*`: packaged mirrors of the mobile web assets and shared UI files. Keep mirrored files byte-identical to their root counterparts.
- `docs/PHONE_SYNC.md`: Phone Sync setup, trust boundaries, tunnel modes, backup formats, and recovery.

## Local Development

Start a local static server from the repository root:

```powershell
python -m http.server 5173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:5173/
```

If port `5173` is busy, use another local port such as `5174`.

Run the desktop shell after installing its dependencies:

```powershell
npm install
npm run desktop
```

Compile the Android Java sources from `android/`:

```powershell
.\gradlew.bat :app:compileDebugJavaWithJavac --no-daemon
```

This app expects these optional local services:

- Ollama chat API: `http://localhost:11434/api/chat`
- ComfyUI/Wan video endpoint: `http://localhost:8188`
- Fauna workspace bridge: `http://127.0.0.1:8765`

Start the optional workspace bridge from the repository root when local file/terminal access is needed:

```powershell
py -3 local-bridge.py --root . --port 8765
```

Paste the printed token into Settings > Local Workspace Bridge. Do not remove the token requirement or widen the bridge bind host unless the user explicitly accepts that risk.

It also links to browser/web services for search and image generation, including Wikipedia, Google, Bing, DuckDuckGo, and Pollinations.

## Change Guidelines

- Keep the app dependency-free unless the user explicitly asks for a framework or package setup.
- Prefer small, local edits in the existing file split: structure in `components/*.html` or `mobile/index.html`, presentation in `styles/*.css` or `mobile/styles.css`, and behavior in the relevant `scripts/*.js`, module, Electron file, or mobile shell.
- Preserve existing DOM ids and class names when possible because `script.js` binds directly to them.
- Add new configurable constants near the existing constants at the top of `script.js`.
- Keep user-facing labels concise, consistent, and fully English.
- Preserve keyboard, mobile, and accessibility affordances when changing controls.
- Never use built-in browser UI for product feedback, help, or styled controls. Use custom Fauna templates/components for toasts, select-like controls, tooltips, dialogs, popovers, and confirmations instead of `alert`, `confirm`, `prompt`, native `title` tooltips, or styled product `<select>` controls.
- Keep the code sandbox restrictive. Do not loosen iframe sandboxing or execute user-provided code in the page context.
- Keep local workspace access opt-in through `local-bridge.py`; never make the browser page directly assume unrestricted filesystem or shell access.
- Keep Phone Sync opt-in and token-protected. LAN access may use HTTP only for private/local addresses. Any access advertised outside the LAN must use HTTPS.
- Never expose or forward the Local Workspace Bridge through Phone Sync, Quick Tunnel, a reverse proxy, or a custom public URL.
- A Cloudflare Quick Tunnel must remain an optional `cloudflared` child process. Never pass the Phone Sync token on its command line, silently install it, or start it without an explicit user action/persisted opt-in.
- Treat custom public URLs as routing metadata, not proof that a tunnel is correctly configured. Accept only origin-level public HTTPS URLs without credentials, query strings, fragments, or paths.
- Keep portable settings backups allowlisted and secret-free. They must exclude chats, API keys, tokens, workspace paths, bridge configuration, and machine-local service endpoints.
- Treat Android connection backups as sensitive because they intentionally include Phone Sync tokens. Keep Android platform backup disabled and require explicit export/import actions.
- Keep Hugging Face imports limited to explicitly approved public GGUF repositories routed through local Ollama. Normalize repository ids and optional quantization before the pull, never accept or place Hugging Face tokens in renderer or command arguments, and leave gated/private imports to an authenticated manual workflow.
- Before local chat submission, verify that the routed model is installed and chat-capable. Preserve the composer when it is missing or downloading, and use only compatible installed models as transparent fallbacks.
- Phone Sync must verify the active local model before accepting a remote prompt so the mobile client can restore its draft on an offline/missing-model response. Expose only installed model metadata through the authenticated model endpoint; remote model selection must reuse the allowlisted settings API.
- When changing `mobile/index.html`, `mobile/app.js`, or `mobile/styles.css`, apply the same change to `android/app/src/main/assets/mobile/` and verify byte equality.
- When changing shared files bundled into Android assets, update the matching file under `android/app/src/main/assets/` as well.
- When adding local storage, use clear `fauna...` key names and define them as constants.
- Avoid unrelated rewrites, formatting churn, or large refactors during feature work.

## Manual Test Checklist

After meaningful UI or behavior changes, verify:

- The page loads from the local dev server without console errors.
- The layout works at desktop width and below `768px`.
- Sidebar open/close works on mobile.
- The Android shell can add, switch, remove, export, and import multiple PC profiles; legacy single-PC preferences migrate once.
- Android rejects public HTTP Phone URLs, cancels invalid TLS certificates, and still accepts private LAN HTTP URLs.
- Phone Sync starts and stops cleanly, token rotation invalidates old pairings, and blocked phones receive a graceful error.
- Quick Tunnel reports missing `cloudflared`, reaches a ready/error state, stops with Phone Sync/app exit, and never disables working LAN access when tunnel startup fails.
- Custom HTTPS mode rejects credentials, paths, public HTTP, and private-address URLs.
- Desktop and mobile portable settings import validate schema/version and never import excluded secret or machine-local keys.
- Root mobile assets and packaged Android mirrors are byte-identical.
- The prompt textarea resizes and `Ctrl+Enter` sends.
- Model dropdown selection updates the active model label.
- File upload previews render and removable attachments still work.
- Chat requests handle both success and Ollama connection failures gracefully.
- Missing local chat models leave the prompt and attachments intact, offer an approved download, and expose progress in the model downloads menu.
- Hugging Face import accepts canonical repository ids/URLs, rejects credentials and extra URL paths, handles optional quantization, and labels installed model provenance.
- Phone Sync lists installed PC models, can switch the allowlisted active provider/model, and restores the mobile draft when local model readiness returns a conflict.
- Local workspace bridge save/test/clear works, and `/tree`, `/read`, and `/run` prompts handle unavailable bridge states gracefully.
- Markdown rendering, copy buttons, and code sandbox previews still work.
- Tools menu toggles, temperature slider, export, and Wan endpoint controls still respond.

## Git Notes

- Check `git status --short --branch` before editing.
- Do not commit, push, or rewrite history unless the user asks.
- Keep generated local artifacts out of the repo.
- Android `build/`, Gradle caches, packaged installers, exported settings, and private connection backups are generated artifacts and must remain untracked.

## Desktop Versioning

- Increment the app version in `major.minor.bugfix` format only when you build and intend to distribute the desktop app.
- Whenever you increment the app version for a distribution build, also update the in-app changelog so the release notes match the new version.
