---
name: FinScope
description: AI Underwriting Intelligence
colors:
  primary: "#6366f1"
  primary-hover: "#4f46e5"
  neutral-bg: "#030712"
  neutral-fg: "#f8fafc"
  card-bg: "rgba(15, 23, 42, 0.65)"
  card-border: "rgba(51, 65, 85, 0.4)"
  emerald: "#10b981"
  amber: "#f59e0b"
  orange: "#f97316"
  red: "#ef4444"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-fg}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  card:
    backgroundColor: "{colors.card-bg}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: FinScope

## 1. Overview

**Creative North Star: "The Clinical Vault"**

FinScope adopts a clinical, expert, and high-reliability aesthetic designed to evoke trust, security, and precision. It utilizes a dark mode base layer coupled with subtle glassmorphic panels and crisp neon indicators for alerts and risk categorization. Spacing is dense to maximize information density, presenting bank statements and underwriter calculations with maximum transparency.

This system explicitly rejects warm-neutral SaaS templates (cream/beige backgrounds), over-animated components, and legacy corporate panels that sacrifice readability.

**Key Characteristics:**
- Dark obsidian base (#030712) with radial indigo-purple backdrop flows.
- Translucent, high-contrast glass panels for structured data representation.
- Strict WCAG AA contrast compliance across all text sizes.

## 2. Colors

The color palette is clinical, utilizing dark cool grays as structural foundations and highly saturated semantic colors to emphasize financial risk categories.

### Primary
- **Indigo Accent** (#6366f1): Used for active UI states, primary buttons, select tabs, and primary interactive zones.

### Neutral
- **Obsidian Dark** (#030712): The default application background.
- **Slate Tint** (#f8fafc): The main text color for ultimate readability and contrast.
- **Card Fill** (rgba(15, 23, 42, 0.65)): Semitransparent fill for glass panels.
- **Muted Border** (rgba(51, 65, 85, 0.4)): Standard border for structural blocks.

### Named Rules
**The Restrained Glow Rule.** Glow and backdrop filter blurs must only be used on major panel wrappers and structural regions. Never apply blur or glow to utility text, input boundaries, or transaction records.

## 3. Typography

**Body Font:** System-ui stack (Inter, SF Pro, system-ui)
**Label/Mono Font:** Courier New, SF Mono, Courier, monospace

### Hierarchy
- **Display** (Bold, 30px-48px, 1.2): Main page headers and hero taglines.
- **Headline** (Bold, 20px-24px, 1.3): Major card titles and dashboard section headers.
- **Title** (SemiBold, 16px-18px, 1.4): Minor panel headers.
- **Body** (Regular, 14px-15px, 1.5): Narration text, descriptions, and user inputs. Maximum line length 75ch.
- **Label** (Bold, 10px-11px, 1.1, uppercase): Eyebrows, column headings, and secondary data labels.

## 4. Elevation

Depth is created primarily using translucent glass panels and sharp borders rather than fuzzy decorative shadows.

### Shadow Vocabulary
- **Interactive Focus** (0 8px 32px 0 rgba(99, 102, 241, 0.05)): Displayed when hovering over glass panels.

### Named Rules
**The Flat-By-Default Rule.** Panel surfaces remain flat and border-only. Interactive cards elevate slightly on hover (-translate-y-0.5) to signify clickability.

## 5. Components

### Buttons
- **Shape:** Rounded-xl (12px)
- **Primary:** Background Indigo (#6366f1), text Slate Tint (#f8fafc), internal padding (8px 16px).
- **Hover:** Background Indigo Hover (#4f46e5).

### Cards / Containers
- **Corner Style:** Rounded-2xl (16px)
- **Background:** Card Fill (rgba(15, 23, 42, 0.65)) with backdrop-filter blur (12px).
- **Border:** Muted Border (rgba(51, 65, 85, 0.4)).
- **Internal Padding:** p-5 or p-6.

### Inputs / Fields
- **Style:** Background Slate-900, border Slate-800, rounded-xl (12px), text-sm.
- **Focus:** Border Indigo (#6366f1).

## 6. Do's and Don'ts

### Do:
- **Do** maintain a strict 4.5:1 contrast ratio for all secondary metrics and indicators.
- **Do** allow column text and cards to wrap naturally on smaller resolutions.
- **Do** preserve the sticky RiskCard sidebar behavior so it guides the underwriter scrolling through transactions.

### Don't:
- **Don't** use side-stripe borders (border-left or border-right) to call out specific transaction categories. Use background tints or inline warning icons instead.
- **Don't** use fluid typography in dashboard panels; use fixed layouts that don't overlap when resized.
- **Don't** use cream, linen, or beige tones for panel card backgrounds.
