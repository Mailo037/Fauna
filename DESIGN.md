---
name: Flora AI
description: A calm local-first AI workstation for English local-AI prompting.
colors:
  background: "#111214"
  sidebar-background: "#111214"
  surface: "#202126"
  surface-raised: "#2a2b31"
  surface-input: "#2b2c32"
  border: "#3a3d46"
  accent: "#5b7cfa"
  accent-strong: "#4868dc"
  accent-orange: "#d97757"
  accent-orange-strong: "#c85f3a"
  accent-green: "#46a66f"
  accent-green-strong: "#348757"
  accent-red: "#e05f5f"
  accent-red-strong: "#bd4545"
  warm: "#b9bdc8"
  text: "#eff2fb"
  text-muted: "#a2a8b6"
  text-dim: "#737988"
typography:
  display:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0"
  body:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, Liberation Mono, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  "2xl": "24px"
components:
  composer-surface:
    backgroundColor: "{colors.surface-input}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    padding: "15px 17px 12px"
  suggestion-chip:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "7px 9px"
  status-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    rounded: "7px"
    padding: "5px 9px"
  dropdown-panel:
    backgroundColor: "{colors.surface-input}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "14px"
  custom-select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 12px"
  custom-tooltip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "6px 8px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
    width: "26px"
    height: "26px"
  input-field:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "8px"
---

# Design System: Flora AI

## 1. Overview

**Creative North Star: "The Local Console"**

Flora's interface should feel like a premium local workstation: compact, capable, and quiet enough for repeated use. The visual system now follows a DeepSeek-like chat shell: a flat near-black canvas, slim rail, centered thread, rounded bottom composer, and a small blue signal reserved for active state, brand mark, and key values.

The product should not perform like a marketing page. It should feel self-contained, trustworthy, and deliberate: a local AI console where service status, model choice, and next action are obvious without decoration. User-facing copy must be English-only, concise, and consistent.

**Key Characteristics:**

- Compact app shell with a narrow icon rail and centered composer.
- Neutral graphite palette with one restrained blue accent.
- Local-first product typography: system UI for interface text and system mono for technical values.
- Minimal elevation at rest; depth comes from tonal layers, borders, and state.
- Calm English voice that avoids accidental language switching.

## 2. Colors

The palette is a local-console palette: graphite surfaces, cool-neutral text, and a blue accent used sparingly.

### Primary

- **Blue Signal** (`#5b7cfa`): Use only for active brand marks, selected values, primary state, and rare attention points. It should not become page decoration.

### Neutral

- **Workspace Black** (`#111214`): Main dark app background.
- **Rail Black** (`#111214`): Sidebar background.
- **Panel Graphite** (`#202126`): Default surface for panels and dropdowns.
- **Raised Graphite** (`#2a2b31`): Hover, active, chips, and selected subtle states.
- **Composer Graphite** (`#2b2c32`): Floating prompt composer and dense settings panels.
- **Soft Border** (`#3a3d46`): Default dividers and control borders.
- **Bone Text** (`#eff2fb`): Primary readable text.
- **Muted Bone** (`#a2a8b6`): Secondary labels and inactive controls.
- **Dim Stone** (`#737988`): Tertiary metadata only.

### Named Rules

**The One Signal Rule.** The blue accent is for state and trust, not ornament. If more than 10 percent of a screen is accent-colored, the interface is shouting.

**The Accent Variant Rule.** Users may switch the primary signal between Blue, Claude Orange, Green, and Red. The accent remains a state color only; changing it must not create a one-color theme or decorative wash.

**The Local Status Rule.** Status colors must describe real local service state. Do not use SaaS-plan colors or upsell cues.

## 3. Typography

**Display Font:** System UI sans stack  
**Body Font:** System UI sans stack  
**Label/Mono Font:** System mono stack for technical values and code-adjacent labels

**Character:** The system stack carries the product because it is fast, local, compact, and familiar. Typography should feel native to the machine rather than imported from a template.

### Hierarchy

- **Display** (700, 34px, 1.15): Welcome greeting only.
- **Headline** (600-700, 16-20px, 1.2): Rare section titles and generated response headings.
- **Title** (600, 12-14px, 1.2): suggestion chips, compact labels, and panel titles.
- **Body** (400-500, 13-14px, 1.5): chat text, settings descriptions, and interface prose.
- **Label** (600, 10-11.5px, 1.2): dense tool labels, model IDs, and metadata. Never go below 11px for essential text.
- **Mono** (500-600, 11px, 1.4): token counts, temperature values, model IDs, code labels.

### Named Rules

**The Product Type Rule.** UI controls use system UI or system mono only. Imported marketing fonts are prohibited.

**The Readability Floor Rule.** Essential labels and descriptions must render at 11px or larger and meet WCAG AA contrast.

## 4. Elevation

Flora should be flat by default. Depth is conveyed through tonal layers, thin borders, and active/focus state. Large diffuse shadows are allowed only for temporary overlays or legacy composer treatment; the compact shell should prefer no shadow.

### Shadow Vocabulary

- **Legacy Composer Lift** (`0 10px 40px rgba(0,0,0,0.45)`): Existing older composer elevation. Avoid for new compact controls.
- **Dropdown Lift** (`0 -10px 30px rgba(0,0,0,0.5)`): Existing tools dropdown elevation. Use only when an overlay must separate from the composer.

### Named Rules

**The Flat-At-Rest Rule.** Default surfaces are flat. Elevation appears only for overlays, focus, or transient state.

**The No Ghost Card Rule.** Do not pair a 1px border with a wide decorative shadow on ordinary cards or buttons.

## 5. Components

### Buttons

- **Shape:** Small rounded controls (6-8px) for rectangular buttons, full circles for icon-only rail actions.
- **Primary:** The current run action is compact and icon-like; new primary actions should use Blue Signal only when they trigger the main task.
- **Hover / Focus:** Hover uses Raised Graphite (`#2a2b31`) and Bone Text. Focus must use a visible outline or border shift, not shadow alone.
- **Secondary / Ghost:** Ghost buttons are transparent at rest and fill with Raised Graphite on hover.

### Chips

- **Style:** Suggestion chips use Raised Graphite, Strong Border, 8px radius, and compact horizontal padding.
- **State:** Chips should be real buttons with visible focus and 44px touch target on mobile.

### Cards / Containers

- **Corner Style:** Composer uses 16px radius; dropdowns use 12px; chips and nav items use 8px or circular shapes.
- **Background:** Use tonal layers in this order: background, panel, raised, input.
- **Shadow Strategy:** Flat by default. Dropdowns may lift. Repeated cards should not use decorative shadows.
- **Border:** Default 1px Soft Border; stronger borders only on hover/focus.
- **Internal Padding:** Dense controls use 6-9px; composer and dropdowns use 14-17px.

### Inputs / Fields

- **Style:** Dark background, 1px border, 6px radius for settings fields; transparent composer textarea inside the floating composer.
- **Focus:** Border shift to a stronger neutral or accent-tinted state. Add visible `:focus-visible` where missing.
- **Error / Disabled:** Errors should stay calm, explicit, and actionable; disabled controls need text contrast, not opacity alone.

### Custom UI Primitives

- **Built-In Browser UI Rule:** Do not use built-in browser UI for product feedback, help, or styled controls. Flora must use custom templates/components for toasts, select-like controls, tooltips, dialogs, popovers, and confirmations instead of `alert`, `confirm`, `prompt`, native `title` tooltips, or styled product `<select>` controls.
- **Template Rule:** Reusable notices and select-like controls should come from DOM templates, then be wired by modules. This keeps the app dependency-free while preventing one-off browser-default UI.
- **Accessibility Rule:** Custom primitives must keep roles, labels, keyboard navigation, focus-visible states, and mobile touch targets.

### Navigation

- **Style:** Compact rail with circular icon actions, active state on Raised Graphite, and muted inactive icons.
- **Mobile:** Sidebar becomes a drawer below 768px. Touch targets must be at least 44px and no text may clip outside the viewport.

### Notifications

- **Style:** Toasts are compact system notices with icon, title, message, dismiss control, and a subtle timeout meter.
- **Placement:** Desktop stacks from the lower right; mobile sits above the composer area without blocking input controls.
- **State:** Info uses Blue Signal; success, warning, and error use semantic colors. Never rely on color alone: the icon and title must also communicate state.
- **Behavior:** Auto-dismiss after a short delay, keep manual dismissal available, and cap the stack to prevent notification clutter.

### Signature Component: Floating Composer

The composer is the product's anchor. It should stay centered before the first message, move to the bottom after chat begins, and keep attachment, tools, model, run, and voice controls visually grouped without making the prompt feel cramped.

## 6. Do's and Don'ts

### Do:

- **Do** preserve the local-console palette: `#111214`, `#202126`, `#eff2fb`, and `#5b7cfa`.
- **Do** make local service state real and visible: Ollama connected/offline, active model, Wan configured/unconfigured.
- **Do** keep user-facing copy fully English with consistent terms.
- **Do** use real semantic controls for clickable UI.
- **Do** use Flora's custom templates for toasts, select-like controls, and tooltip affordances.
- **Do** keep product density calm and scannable.

### Don't:

- **Don't** make Flora feel like a generic SaaS landing page.
- **Don't** make Flora feel like a noisy AI demo.
- **Don't** use a glassy gradient chatbot clone style.
- **Don't** turn the interface into a cluttered enterprise dashboard.
- **Don't** use `Free plan`, `Upgrade`, or plan-language unless the product truly has accounts and billing.
- **Don't** introduce broad decorative gradients, glassmorphism, or wide soft shadows on ordinary controls.
- **Don't** use tiny 9px text for meaningful settings, status, or mobile labels.
- **Don't** use `alert`, `confirm`, `prompt`, native `title` tooltips, or styled product `<select>` controls.
