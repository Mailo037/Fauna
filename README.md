# fauna-ai

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
