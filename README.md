# Fauna

Fauna is a local-first AI workspace for chatting with local Ollama models, connecting optional hosted AI providers, attaching files, generating media, and keeping chats on your machine.

## Use

## Desktop App

Install the desktop dependencies once:

```powershell
npm install
```

Run the desktop shell:

```powershell
npm run desktop
```

Build a Windows installer and portable executable:

```powershell
npm run desktop:build
```

The desktop app uses the same web UI. Settings are stored in `%AppData%\Fauna`, chats are stored under `%AppData%\Fauna\chats\<chatId>`, generated media is saved in each chat's `media` folder, and the local workspace bridge starts automatically.

## Local Workspace Bridge

In the browser, Fauna can read this workspace, run terminal commands, and relay OpenAI API calls only when the optional bridge is running locally.
It also lets Fauna inspect public web pages when browser CORS blocks direct site reads.

```powershell
py -3 local-bridge.py --root . --port 8765
```

Copy the printed URL and token into Fauna Settings > Local Workspace Bridge, then enable Local Workspace in Tools. The desktop app handles this step automatically.

Useful prompts:

```text
/tree
/read script.js
/run git status --short
/web https://example.com
```

## Legal

Fauna is released under the MIT license. You can use, copy, modify, publish, and distribute it as long as the license notice is included.

Fauna can connect to local services such as Ollama, ComfyUI/Wan, and the optional workspace bridge. It can also open or call third-party services when you configure them, such as OpenAI, Google, Bing, DuckDuckGo, Wikipedia, or Pollinations. Review each service's terms and privacy policy before sending data to it.

The local workspace bridge is opt-in and token-protected. Only run it for folders you trust, and do not expose it beyond localhost unless you understand and accept the risk.
