# Mobile UI kit and screen reference

This doc is the single source of truth for Phase 1 mobile UI decisions. Agents
building any Phase 1 screen should start here and reuse the tokens and
components below instead of inventing visual decisions.

## Visual principles

- **WhatsApp-fidelity first.** Phase 1 screens are intentionally pixel-close to
  WhatsApp: the same information hierarchy, bubble shapes, list densities, and
  header patterns. We will intentionally differentiate branding later.
- **Tokens are the source of truth.** Every color, spacing value, font size,
  and radius used in screen code must come from the NativeWind/Tailwind config
  in `apps/mobile/tailwind.config.js`. Hardcoded hex values or one-off sizing in
  screen code are a review failure.
- **Hand-rolled NativeWind components.** The base kit lives in
  `apps/mobile/components/`. No full UI library (Tamagui, gluestack,
  React-Native-Reusables) — the chat UI is custom-heavy and a second theming
  system adds upgrade churn.
- **Light and dark from day one.** All semantic colors are defined as CSS custom
  properties in `apps/mobile/global.css`. Components use a single token class
  (e.g. `bg-background`); the value switches automatically under the `.dark`
  class. Runtime dark-mode switching logic is out of scope for this issue.

## Design tokens

Tokens are defined in `apps/mobile/tailwind.config.js` and the CSS variables
that back them live in `apps/mobile/global.css`.

### Semantic colors

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `primary` | `#00a884` | `#00a884` | CTA fills, active states, outgoing bubble in dark |
| `primary-emphasis` | `#008069` | `#008069` | Hover/press emphasis |
| `background` | `#ffffff` | `#0b141a` | App/root background |
| `surface` | `#ffffff` | `#111b21` | Cards, list rows, headers, composer |
| `chat-bg` | `#e5ddd5` | `#0b141a` | Chat thread background |
| `incoming` | `#ffffff` | `#202c33` | Incoming message bubble |
| `outgoing` | `#d9fdd3` | `#005c4b` | Outgoing message bubble |
| `on-background` | `#111b21` | `#e9edef` | Primary text on background |
| `on-surface` | `#111b21` | `#e9edef` | Primary text on surface |
| `muted` | `#667781` | `#8696a0` | Timestamps, secondary text, placeholders |
| `border` | `#d1d7db` | `#313d45` | Dividers, input borders |
| `status` | `#53bdeb` | `#53bdeb` | Delivery/read ticks, status indicators |
| `danger` | `#ea0038` | `#ea0038` | Errors, destructive actions, badge fills |
| `warning` | `#f0a500` | `#f0a500` | Warnings |

### Spacing

Use the named scale so the whole product stays on an 8 px rhythm:

| Token | Value |
|-------|-------|
| `2xs` | `2px` |
| `xs` | `4px` |
| `sm` | `8px` |
| `md` | `12px` |
| `lg` | `16px` |
| `xl` | `20px` |
| `2xl` | `24px` |
| `3xl` | `32px` |
| `4xl` | `48px` |

### Typography

| Token | Size | Line height | Use |
|-------|------|-------------|-----|
| `2xs` | `10px` | `12px` | Meta timestamps inside bubbles |
| `xs` | `12px` | `14px` | Section headers, badge text |
| `sm` | `14px` | `18px` | Body secondary, list subtitles |
| `base` | `16px` | `20px` | Body, input text |
| `lg` | `18px` | `22px` | Screen titles (chat name) |
| `xl` | `20px` | `24px` | Large empty-state headings |
| `2xl` | `24px` | `28px` | Modals/confirmation titles |
| `3xl` | `30px` | `34px` | Auth hero text |

### Radii

| Token | Value | Use |
|-------|-------|-----|
| `sm` | `4px` | Tiny chips |
| `md` | `8px` | Inputs, small buttons |
| `lg` | `12px` | Bubbles, cards |
| `xl` | `16px` | Large bottom sheets/modals |
| `2xl` | `24px` | Call controls |
| `full` | `9999px` | Avatars |

## Component kit conventions

All components are in `apps/mobile/components/` and are tested with vitest
renders in `components/*.test.tsx`.

- **Hand-rolled on NativeWind only.** Do not import third-party UI kits.
- **Props are typed.** Export the props interface from the component file.
- **Use semantic tokens.** Prefer `bg-surface`, `text-muted`, `rounded-lg`, etc.
- **Composition over configuration.** Keep components small; layout and spacing
  are usually the parent screen's job.
- **Accessibility labels.** Use React Native accessibility props on interactive
  components (they are ignored in the test stub but meaningful on device).

### Kit inventory

| Component | File | Responsibility |
|-----------|------|----------------|
| `Avatar` | `avatar.tsx` | Circular profile image with initials fallback |
| `Badge` | `badge.tsx` | Unread-count pill |
| `Button` | `button.tsx` | Primary, secondary, and ghost actions |
| `TextField` | `text-field.tsx` | Labelled input with error text |
| `AppBar` | `app-bar.tsx` | Top screen header with optional actions |
| `ChatBubble` | `chat-bubble.tsx` | Incoming/outgoing message bubble |
| `ChatListItem` | `chat-list-item.tsx` | Row in the conversation list |
| `Composer` | `composer.tsx` | Message input + send button row |

## Screen inventory

These are the Phase 1 screens. Each entry describes the WhatsApp reference
layout textually and reserves a placeholder for an annotated screenshot
captured from a physical WhatsApp install (a separate human task).

### Chat list

- **Reference:** WhatsApp main "Chats" tab.
- **Layout:** Full-width list rows; each row has a circular avatar on the left,
  contact name + last message stacked in the middle, and a timestamp with an
  optional unread badge on the right. Header is an `AppBar` titled "Chats" with
  a new-chat action.
- **Tokens:** `bg-background` root, `bg-surface` rows, `text-on-surface` names,
  `text-muted` message previews/timestamps.
- **Screenshot placeholder:** `docs/ui/chat-list.png` (annotated: row heights,
  avatar size, badge placement, header height).

### Chat thread

- **Reference:** A WhatsApp 1:1 conversation.
- **Layout:** `AppBar` at the top showing contact name and call/actions menu.
  Messages scroll in a `chat-bg` area. Each message is a `ChatBubble`.
  `Composer` is pinned to the bottom.
- **Tokens:** `chat-bg` background, `bg-incoming`/`bg-outgoing` bubbles,
  `text-on-background` bubble text, `text-muted` timestamps, `bg-status` read
  ticks.
- **Screenshot placeholder:** `docs/ui/chat-thread.png` (annotated: bubble
  max-width, tail radius, composer height, status icon size).

### Composer

- **Reference:** The message input bar at the bottom of a WhatsApp thread.
- **Layout:** A rounded multiline input with a send CTA on the right, inside a
  `surface` bar with a top border.
- **Tokens:** `bg-surface`, `border-border`, `bg-primary` send button,
  `text-white` button label.
- **Screenshot placeholder:** `docs/ui/composer.png`.

### Call UI placeholder

- **Reference:** A WhatsApp 1:1 voice/video call screen.
- **Layout:** Full-screen dimmed overlay with large avatar/name, mute/flip/end
  controls, and a degradation banner. This is a visual placeholder only;
  WebRTC wiring belongs to the calls subtree.
- **Tokens:** `bg-background`, `primary`, `danger`, `muted`.
- **Screenshot placeholder:** `docs/ui/call-ui.png`.

### Settings

- **Reference:** WhatsApp "Settings" tab.
- **Layout:** Profile header with avatar + name + phone, followed by a grouped
  list of rows (Account, Chats, Notifications, etc.) with chevrons.
- **Tokens:** `bg-background` root, `bg-surface` grouped sections,
  `border-border` separators, `text-on-surface` labels, `text-muted` subtitles.
- **Screenshot placeholder:** `docs/ui/settings.png`.

### Auth / OTP

- **Reference:** WhatsApp phone-number entry and verification flow.
- **Layout:** Centered country picker, phone input, and CTA button on a
  branded background; subsequent screen is a 6-digit code input.
- **Tokens:** `bg-background`, `text-on-background`, `bg-primary`, `text-white`,
  `text-danger` for validation errors.
- **Screenshot placeholder:** `docs/ui/auth-otp.png`.

## Token usage rules

1. **No hardcoded colors in screen code.** Use `bg-primary`, not `#00a884`.
   Exceptions: CSS custom property definitions in `global.css` only.
2. **No hardcoded spacing in screen code.** Use `p-lg`, not `p-4` (unless the
   standard Tailwind scale already matches). Prefer the named token scale.
3. **No hardcoded radii in screen code.** Use `rounded-lg`, not `rounded-[12px]`.
4. **No hardcoded typography in screen code.** Use `text-base`, `font-semibold`,
   not arbitrary sizes.
5. **Use semantic color names for meaning.** `bg-surface` for cards,
   `bg-chat-bg` for the thread background, `bg-incoming`/`bg-outgoing` for
   bubbles. Do not repurpose a token for a different meaning.
6. **Dark mode is token-level, not component-level.** Components should not
   carry `dark:bg-...` classes; the CSS variable switches under `.dark`.

## Testing UI in vitest

Components are rendered using a lightweight `react-native` stub
(`apps/mobile/src/test/react-native-stub.tsx`) that maps React Native primitives
to plain DOM elements so `react-dom/server` can render them in Node. Tests live
next to components and assert on rendered text, token class names, and theme
wrapper output.

To test a component under a specific theme:

```tsx
import { renderWithTheme } from "../src/test/render-with-theme";

const html = renderWithTheme(<MyScreen />, { isDark: true });
```

## Out of scope

- Feature screen wiring, navigation, and data fetching (owned by mobile subtree
  issues and ADR-0012 patterns).
- Annotated screenshot capture from a physical WhatsApp install (human task;
  placeholder paths are documented above).
- Runtime dark-mode toggle beyond the CSS variable definitions and `.dark`
  class hook.

## References

- `apps/mobile/tailwind.config.js` — token definitions.
- `apps/mobile/global.css` — CSS custom properties for light/dark values.
- `apps/mobile/components/` — base component kit.
- `docs/adr/0004-technology-stack.md` — NativeWind stack decision.
- `docs/adr/0012-mobile-data-state-architecture.md` (auto.tm-rewrite ADR-0012
  pattern) — where data/state wiring lives.
