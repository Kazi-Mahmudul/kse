# KSE Design Tokens

Extracted from [UI.jpeg](UI.jpeg) (spec §32 visual direction). Single source
of truth for step 4 (design system); referenced by `apps/mobile/src/constants/theme.ts`.

## Colors

| Token | Value | Usage |
|---|---|---|
| primary | `#4F46E5` | Buttons, active states, headers, FAB |
| primary-dark | `#7C3AED` | Secondary purple, gradients |
| accent-teal | `#06B6D4` | Progress rings, illustrations |
| success | `#10B981` | Profile completion, verified badges |
| warning | `#F59E0B` | Scholarship highlights, ratings |
| danger | `#F43F5E` | Events, deadline alerts |
| background | `#FFFFFF` | Light backgrounds |
| surface-tinted | pastel orange / mint / pink / lavender | Dashboard stat tiles |

## Typography

- Font: **Poppins** (Google Font — needs `@expo-google-fonts/poppins`)
- Weights: Bold (headlines ~28–32), Medium (titles/labels), Regular (body), caption (metadata)

## Shape

- Cards: radius 16–20
- Buttons: radius 12 (primary), pill for chips/search
- Shadows: very subtle; prefer light-gray fills + thin borders
- Inputs: light gray fill, rounded

## Navigation (spec §32)

Home · Explore · **(+) elevated circular FAB** · Community · Profile
(active = indigo, inactive = gray)

## Patterns

- Filter chips (pill, active filled indigo)
- Circular progress rings (profile score / completion)
- Bookmark icon top-right on listing cards
- "See All" links right-aligned with section headers
- Gradient indigo promo banner with flat illustration
- "Verified Student" green pill on profile
