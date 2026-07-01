# flora-ai

## Local Workspace Bridge

Flora can read this workspace and run terminal commands only when the optional bridge is running locally.

```powershell
py -3 local-bridge.py --root . --port 8765
```

Copy the printed URL and token into Flora Settings > Local Workspace Bridge, then enable Local Workspace in Tools.

Useful prompts:

```text
/tree
/read script.js
/run git status --short
```
