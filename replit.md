# Fauna AI workspace

A static, dependency-free, client-side AI workspace for prompting local models, generating media, and building without leaving your machine.

## Running the project

```
python3 -m http.server 5000
```

Then open `http://127.0.0.1:5000/` (or the Replit preview pane).

## Stack

- **No build step, no bundler, no package manager.** Pure HTML + CSS + vanilla JS.
- `index.html` — DOM structure; uses `data-include` attributes to load components
- `components/*.html` — App shell chunks loaded by `app-shell.js`
- `styles.css` — All layout, responsive behavior, theme tokens, and component styling
- `script.js` — All runtime logic: chat, Ollama calls, file handling, sandbox previews, voice, settings
- `modules/*.js` — Sidebar, theme, storage, lightbox, model-switcher modules
- `local-bridge.py` — Optional localhost bridge for workspace file reads and terminal commands

## Optional local services

| Service | URL |
|---------|-----|
| Ollama chat | `http://localhost:11434/api/chat` |
| ComfyUI / Wan video | `http://localhost:8188` |
| Local workspace bridge | `http://127.0.0.1:8765` |

> These services run on the developer's own machine, not on Replit. Connection errors in the UI are expected in the Replit cloud environment.

## Change guidelines

- Keep the app dependency-free (no npm, no framework) unless the user explicitly asks.
- Prefer small, local edits: structure in `index.html`/`components/`, presentation in `styles.css`, behaviour in `script.js`.
- Preserve existing DOM IDs and class names — `script.js` binds to them directly.
- Add new configurable constants near the existing constants block at the top of `script.js`.
- Use `var(--radius-composer)` (22px) as the reference radius for any new surfaces/modals.
- Never use native browser UI (`alert`, `confirm`, `title` tooltips, styled `<select>`); use Fauna/Fauna custom templates instead.

## User preferences

- App is named **Fauna** (not Fauna).
- Favicon: the letter F with botanical leaf shapes visible through the letterform.
- Settings modal: **always fixed size** — do not change it to resize when switching panes.
- Settings modal: add new **sections** (e.g. Personalization) rather than modifying existing ones.
- Welcome screen: keep it **minimal and uncluttered** — no logo glow icon, compact heading.
- Component radius should follow the composer's `--radius-composer: 22px` for visual consistency.
