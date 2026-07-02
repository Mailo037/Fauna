# Agent Instructions

## Project Snapshot

Fauna AI is a static, client-side playground. There is no bundler, package manager, or build step in this repository.

Primary files:

- `index.html`: DOM structure, controls, labels, inline suggestion prompts, and script/style links.
- `components/*.html`: app shell chunks and reusable DOM templates for custom UI primitives.
- `styles.css`: all layout, responsive behavior, theme tokens, and component styling.
- `script.js`: chat state, Ollama calls, file handling, web/source helpers, local workspace bridge calls, image/video generation, sandbox previews, export, sidebar, model picker, and voice input.
- `local-bridge.py`: optional dependency-free localhost bridge for workspace file reads and terminal commands.
- `modules/*.js`: focused browser modules for sidebar, theme, storage, lightbox, and custom select behavior.
- `README.md`: short project title only.

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
- Prefer small, local edits in the existing file split: structure in `index.html`, presentation in `styles.css`, behavior in `script.js`.
- Preserve existing DOM ids and class names when possible because `script.js` binds directly to them.
- Add new configurable constants near the existing constants at the top of `script.js`.
- Keep user-facing labels concise, consistent, and fully English.
- Preserve keyboard, mobile, and accessibility affordances when changing controls.
- Never use built-in browser UI for product feedback, help, or styled controls. Use custom Fauna templates/components for toasts, select-like controls, tooltips, dialogs, popovers, and confirmations instead of `alert`, `confirm`, `prompt`, native `title` tooltips, or styled product `<select>` controls.
- Keep the code sandbox restrictive. Do not loosen iframe sandboxing or execute user-provided code in the page context.
- Keep local workspace access opt-in through `local-bridge.py`; never make the browser page directly assume unrestricted filesystem or shell access.
- When adding local storage, use clear `fauna...` key names and define them as constants.
- Avoid unrelated rewrites, formatting churn, or large refactors during feature work.

## Manual Test Checklist

After meaningful UI or behavior changes, verify:

- The page loads from the local dev server without console errors.
- The layout works at desktop width and below `768px`.
- Sidebar open/close works on mobile.
- The prompt textarea resizes and `Ctrl+Enter` sends.
- Model dropdown selection updates the active model label.
- File upload previews render and removable attachments still work.
- Chat requests handle both success and Ollama connection failures gracefully.
- Local workspace bridge save/test/clear works, and `/tree`, `/read`, and `/run` prompts handle unavailable bridge states gracefully.
- Markdown rendering, copy buttons, and code sandbox previews still work.
- Tools menu toggles, temperature slider, export, and Wan endpoint controls still respond.

## Git Notes

- Check `git status --short --branch` before editing.
- Do not commit, push, or rewrite history unless the user asks.
- Keep generated local artifacts out of the repo.
