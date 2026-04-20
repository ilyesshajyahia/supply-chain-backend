# Design System Documentation: The Immutable Ledger

## 1. Overview & Creative North Star
**Creative North Star: The Architectural Vault**

To design for blockchain traceability is to design for the absolute. This design system moves beyond "generic fintech" by adopting the persona of a high-end digital vault. We eschew the cluttered, line-heavy interfaces of traditional enterprise software in favor of **Architectural Minimalism**. 

The system breaks the "template" look through **intentional asymmetry** and **tonal depth**. By utilizing a "High-End Editorial" approach, we treat data like a precious gallery object—surrounded by expansive whitespace (the "oxygen" of the UI) and layered on sophisticated, monochromatic surfaces. This establishes an immediate sense of enterprise-grade security and "Quiet Luxury."

---

## 2. Colors & Surface Philosophy

The palette is anchored in Deep Navy and Trust Blue, engineered to evoke the stability of a Tier-1 financial institution.

### The "No-Line" Rule
Traditional 1px borders are strictly prohibited for sectioning. They create visual "noise" that undermines a premium feel. Instead, boundaries must be defined solely through background color shifts.
- Use `surface-container-low` (#f2f4f7) to sit atop a `surface` (#f7f9fc) background. 
- Use vertical white space (Scale 8 or 10) to denote section changes rather than a divider line.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use a "Nested Elevation" model:
1.  **Base Layer:** `background` (#f7f9fc).
2.  **Section Layer:** `surface-container-low` (#f2f4f7) for grouping related content.
3.  **Object Layer:** `surface-container-lowest` (#ffffff) for individual cards or interactive elements.
This creates a soft, natural lift that communicates hierarchy without the heavy-handedness of traditional drop shadows.

### The "Glass & Gradient" Rule
To elevate the "ChainTrace" experience, floating elements (like navigation bars or hovering action modals) should utilize **Glassmorphism**.
- **Token:** Use `surface` color at 80% opacity with a 20px `backdrop-blur`.
- **Signature Texture:** For primary CTAs, apply a subtle linear gradient from `primary` (#001533) to `primary-container` (#0f2a4f) at a 135° angle. This adds "soul" and a metallic sheen that feels custom-machined.

---

## 3. Typography: Editorial Authority

We use **Inter** not as a utility font, but as a branding tool. The hierarchy is designed to feel like a high-end technical journal.

*   **Display Scale (`display-md`):** Used for high-level data summaries (e.g., "99.9% Verified"). It commands the page with authority.
*   **Headline Scale (`headline-sm`):** Used for major module titles. Ensure generous tracking (-0.02em) to maintain a modern, tight appearance.
*   **Body Scale (`body-lg`):** Our standard for product descriptions. Inter’s tall x-height ensures readability of complex blockchain hashes.
*   **Label Scale (`label-md`):** Used for metadata. Always paired with `text-secondary` (#4A5B6A) to ensure the primary information remains the focal point.

---

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved through **Tonal Layering** rather than structural lines. Placing a `surface-container-lowest` card on a `surface-container-low` background provides all the separation required for a premium enterprise tool.

### Ambient Shadows
When an element must "float" (e.g., a dropdown or a critical alert), use **Ambient Shadows**:
- **Blur:** 32px to 64px.
- **Opacity:** 4%–6%.
- **Color:** Use a tinted version of `on-surface` (Deep Navy) rather than pure black. This mimics natural light passing through a high-end environment.

### The "Ghost Border" Fallback
If a border is required for extreme accessibility cases, use a **Ghost Border**: 
- **Token:** `outline-variant` (#c4c6cf) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Cards & Lists
*   **Styling:** 20px radius (`xl` scale). No borders. 
*   **Hierarchy:** Use padding `6` (1.5rem) as the internal standard. Forbid divider lines between list items; use a `surface-container-low` background on hover to indicate interactivity.

### Buttons
*   **Primary:** Solid `primary` (#001533) with `on-primary` text. Use the "Signature Texture" gradient for high-conversion actions.
*   **Secondary:** Ghost style. No background, using a `primary` "Ghost Border" (15% opacity) and `primary` text.
*   **Tertiary:** Text-only with an underline that appears only on hover.

### Pill-Style Status Badges
*   **Verification Success:** `success` (#1B8F5A) text on a `success_container` (#22C55E at 10% opacity) background. 
*   **Shape:** Always `full` (9999px) roundedness to contrast against the 20px card radius.

### Traceability Timeline (Custom Component)
Instead of a standard list, use a vertical "thread" using the `accent` (#1E88E5) color. Use `surface-container-highest` for the track and `primary` for the nodes. This reinforces the "chain" metaphor.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical layouts. Align a title to the far left while pushing the action button to the far right with significant whitespace between them.
*   **Do** use `surface-dim` for inactive states to maintain the sophisticated monochromatic palette.
*   **Do** prioritize high-contrast typography over colorful icons. Let the text lead.

### Don’t
*   **Don’t** use 1px solid dividers. If you feel the need for a line, increase your whitespace scale instead.
*   **Don’t** use pure black (#000000) for shadows. It breaks the "Architectural Vault" atmosphere.
*   **Don’t** use standard "out-of-the-box" blue (#0000FF). Stick to the nuanced `primary` and `accent` tones defined in the palette.