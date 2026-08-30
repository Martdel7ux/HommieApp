# hommiebrand/

Drop the official Hommie brand assets here. The app is wired to consume them:

| Put here | Then update |
| --- | --- |
| Logo (SVG + PNG, light/dark) | `app/(auth)/welcome.tsx` header, splash |
| Colour palette | `src/theme/colors.ts` — replace values in `palette` + semantic maps |
| Typography spec + font files | copy fonts to `assets/fonts/`, register in a new `src/theme/fonts.ts`, update `src/theme/typography.ts` `fontFamily` |
| Spacing / radius scale | `src/theme/spacing.ts` |
| App icon / splash / adaptive / notification icon | `assets/` (same filenames referenced in `app.config.ts`) |
| Figma component reference | match in `src/components/ui/*` |

Screens never hard-code colours or font families — they read semantic tokens from
`src/theme`, so a re-skin is confined to that folder.

## Provided so far

- **`hommielogo.png`** (1024², stylised "H"). Brand colour = **indigo `#4F46E5`**.
  Already wired in: `src/theme/colors.ts` brand ramp, all `assets/` icons
  (regenerate with the scratchpad `mkicons.py` script), `assets/logo.png` +
  `assets/logo-white.png`, and `src/components/Brand/Logo.tsx`.

## Still needed

- Full colour spec (secondary/tertiary steps, any gradients) to confirm the ramp.
- Typography: typeface names + font files → `assets/fonts/`.
- Spacing / radius scale to confirm `src/theme/spacing.ts`.
- Figma screen designs (uploaded per-screen as Phase 2+ is built).
