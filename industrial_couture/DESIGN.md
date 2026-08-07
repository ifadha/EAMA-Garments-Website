---
name: Industrial Couture
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#383939'
  surface-container-lowest: '#0d0e0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#292a2a'
  surface-container-highest: '#343535'
  on-surface: '#e3e2e2'
  on-surface-variant: '#e1bfb8'
  inverse-surface: '#e3e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#a88a83'
  outline-variant: '#59413c'
  surface-tint: '#ffb4a3'
  primary: '#ffb4a3'
  on-primary: '#630f00'
  primary-container: '#ff6b4a'
  on-primary-container: '#661000'
  inverse-primary: '#ae3115'
  secondary: '#c9c6c5'
  on-secondary: '#313030'
  secondary-container: '#4a4949'
  on-secondary-container: '#bab8b7'
  tertiary: '#c8c6c5'
  on-tertiary: '#313030'
  tertiary-container: '#9c9a99'
  on-tertiary-container: '#323232'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad2'
  primary-fixed-dim: '#ffb4a3'
  on-primary-fixed: '#3d0600'
  on-primary-fixed-variant: '#8c1900'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c9c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474646'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474646'
  background: '#121414'
  on-background: '#e3e2e2'
  surface-variant: '#343535'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 72px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.1em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 36px
    fontWeight: '400'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  gutter: 24px
  margin-desktop: 80px
  margin-mobile: 20px
  section-gap: 160px
---

## Brand & Style

This design system establishes a visual language where luxury fashion meets industrial enterprise. It is designed for a B2B audience that demands high-precision manufacturing, ethical transparency, and a premium, editorial experience. 

The aesthetic is **Cinematic Minimalism**. It utilizes high-contrast ratios, expansive whitespace, and a dark, immersive environment to highlight the textures and details of garment craftsmanship. The interface serves as a sophisticated frame for large-scale photographic content, evoking a sense of global scale and technical authority. 

The emotional response should be one of "Trusted Excellence"—moving away from transactional retail patterns toward a relationship-based, architectural presentation of capabilities and heritage.

## Colors

The palette is anchored in deep, architectural tones to create a sense of focus and prestige.

- **Background Strategy:** Use `#0A0A0A` (Pitch Black) for the primary canvas to ensure maximum contrast for imagery. Use `#121212` (Deep Charcoal) for surface containers, cards, and section layering to create subtle depth.
- **Primary Accent:** `#FF6B4A` (Warm Coral) is reserved strictly for primary calls to action, active states, and critical brand highlights. It should be used sparingly to maintain its visual impact.
- **Functional Neutrals:** Use high-clarity whites for typography and `#A1A1A1` for secondary metadata and borders to prevent visual noise.

## Typography

The typography system is a deliberate juxtaposition of heritage and modernity.

- **Editorial Presence:** `Playfair Display` is used for all headlines and display text. Its high-contrast strokes reflect the elegance of couture.
- **Technical Precision:** `Inter` handles all functional UI, body copy, and data-driven content. It provides the "industrial" balance, ensuring legibility at small sizes and a professional, no-nonsense tone for technical specifications.
- **Hierarchy Rule:** Always pair a large Serif headline with a small, tracked-out Sans-Serif label (`label-caps`) above it to ground the design in a luxury editorial aesthetic.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid Grid**. Content is primarily contained within a 12-column grid to maintain structural rigor, while photographic assets may bleed to the edges of the viewport to create a cinematic feel.

- **Rhythm:** An 8px/16px baseline system governs all internal component spacing. 
- **Breathe:** Use generous section gaps (160px+) to separate distinct service offerings or manufacturing capabilities. Whitespace is used as a premium "material" in this design system.
- **Breakpoints:**
  - **Desktop (1440px+):** 12 columns, 80px side margins.
  - **Tablet (768px - 1024px):** 8 columns, 40px side margins.
  - **Mobile (<768px):** 4 columns, 20px side margins.

## Elevation & Depth

This system avoids traditional drop shadows in favor of **Tonal Layering** and **Ghost Outlines**.

- **Surface Tiers:** Background is `#0A0A0A`. Containers/Cards sit on top using `#121212`.
- **Borders:** Use a 1px solid border of `#FFFFFF` at 10% opacity for container definition. This creates a sharp, technical edge without the "weight" of a shadow.
- **Interactive Depth:** On hover, cards or buttons may increase border opacity to 30% or transition the background slightly lighter. Shadows, if used at all, should be extremely subtle (blur 20px, opacity 0.4) and tinted with the primary coral color to simulate an ambient glow rather than a physical lift.

## Shapes

The shape language is precise and controlled. 

- **Corner Radii:** Use a "Soft" setting (4px - 8px) for cards and buttons. This provides just enough approachable warmth to the industrial grid without feeling playful or consumer-grade.
- **Containers:** Large image containers should remain sharp (0px) to mimic the look of physical lookbooks or framed photography.
- **Icons:** Use thin-stroke (1.5pt) linear icons with sharp terminals to align with the technical nature of manufacturing.

## Components

### Buttons
- **Primary:** Solid `#FF6B4A` with white or pitch-black text. 4px radius. Large horizontal padding (32px).
- **Secondary/Ghost:** 1px border of white (20% opacity) with white text. Transition to solid white text on hover.
- **Interaction:** Use subtle "slide-up" animations for text or slight width expansions to indicate interactivity.

### Cards & Containers
- Cards are for "Capability Modules" or "Fabric Categories."
- No drop shadows; use the `#121212` surface against the `#0A0A0A` background.
- Include a 1px subtle border. Content should have 32px of internal padding.

### Lists & Data
- Technical specs for garment construction should be presented in clean, monospaced-adjacent styles using `Inter`.
- Use thin horizontal dividers (`#FFFFFF` at 10%) rather than boxes to separate list items.

### Photographic Containers
- Central to the system. Use "Aspect Ratio" boxes (e.g., 4:5 or 16:9).
- Images should have a subtle dark overlay (10-20%) to ensure text overlays remain legible and the cinematic atmosphere is maintained.

### Input Fields
- Underline-only or very subtle boxed inputs. No heavy borders. 
- Focus state is signaled by the primary coral color on the bottom border or a subtle glow.