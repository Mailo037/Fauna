# fauna-ai

## Local Workspace Bridge

Fauna can read this workspace, run terminal commands, and relay OpenAI API calls only when the optional bridge is running locally.
It also lets Fauna inspect public web pages when browser CORS blocks direct site reads.

```powershell
py -3 local-bridge.py --root . --port 8765
```

Copy the printed URL and token into Fauna Settings > Local Workspace Bridge, then enable Local Workspace in Tools.

Useful prompts:

```text
/tree
/read script.js
/run git status --short
/web https://example.com
```
