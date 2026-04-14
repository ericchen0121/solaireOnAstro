# Animation notes

Developer-facing reference for GSAP utilities under `src/animations/`.

## Letter reveal (`letterReveal.ts`)

Character-by-character “typing” reveal using **GSAP SplitText**. Used on the **homepage hero** (`.hero-title`) and in the **contact form** (per-field reveals).

### Usage

```typescript
import { initLetterReveal } from '../animations/letterReveal';

initLetterReveal('.hero-title', delaySeconds, staggerSeconds, options);
```

| Argument | Description |
|----------|-------------|
| `selector` | CSS selector for the container (must include a `.hero-headline` span and usually a `.hero-cursor` sibling). |
| `delay` | Seconds before the first character appears (default `0`). |
| `stagger` | Seconds between each character (default `0.05`). |
| `options` | Optional. See below. |

### Options (`LetterRevealOptions`)

| Property | Default | Description |
|----------|---------|-------------|
| `endCursorBlink` | `true` | If `true`, the caret keeps **blinking** after the last character. If `false`, the caret is **hidden** when typing finishes (`opacity: 0`, `display: none`). |

Call sites that omit `options` behave as before: **`endCursorBlink: true`**.

### Homepage hero: single toggle

For the home hero only, the flag is centralized in **`letterReveal.ts`**:

```typescript
export const HERO_END_CURSOR_BLINK = false;
```

- Default is **`false`**: no blinking bar after the last character.
- Set to **`true`** to keep the caret blinking at the end of the sentence.
- **`src/pages/index.astro`** passes this into `initLetterReveal` as `{ endCursorBlink: HERO_END_CURSOR_BLINK }`.

Changing the constant is enough; you do not need to edit the page unless you want a one-off override.

### Cleanup

`initLetterReveal` returns a teardown function. It kills the end-phase delayed call and the looping “end blink” timeline so navigation away mid-animation does not leak tweens.

### Related styling

- Hero line-height override: `--typo-hero-h2-leading` and `.hero .hero-title` in `src/styles/global.css`.
- Cursor appearance: `.hero-cursor` in `global.css`; position is driven by JS from character bounding boxes.
