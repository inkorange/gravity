# Gravity Playground — Implementation Phases

## Workflow

- Each phase gets its own branch off `main` (e.g., `phase-0/scaffold`)
- At the end of each phase, a PR is opened to `main` via `gh pr create`
- Chris reviews, approves, and merges manually before the next phase begins
- Commits are authored by Chris (no co-author tags)

---

## Current State

Phase 0 is partially complete:
- Next.js 16 scaffold created with App Router, TypeScript (strict), Tailwind CSS 4
- Deps installed: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `framer-motion`, `@types/three`
- `next.config.ts` configured with `output: "export"`, React Compiler, unoptimized images
- Directory structure created: `src/{components,lib,hooks,contexts,types}`, `public/{models,textures/planets,textures/hdri,draco}`
- `globals.css` set up with space theme CSS custom properties and planet color palette
- `layout.tsx` configured with Nunito font, SEO metadata
- `page.tsx` still has default Next.js boilerplate (needs replacement)

---

## Phase 0: Scaffold & Environment `phase-0/scaffold`

**Goal**: `pnpm dev` serves a dark-themed empty page. All tooling works.

### Remaining work
- [x] Replace `page.tsx` boilerplate with minimal dark page + "Gravity Playground" title
- [x] Verify `pnpm build` succeeds with static export
- [x] Verify `pnpm dev` runs clean (no errors)
- [x] Create `src/types/index.ts` with core TypeScript interfaces (`CelestialBody`, `DroppableObject`, `DropState`, `SimulationState`)
- [x] Create `src/lib/constants.ts` with physics constants (drop height, time scale target, restitution)
- [x] Clean up unused default assets (`file.svg`, `globe.svg`, `window.svg`, `next.svg`, `vercel.svg`)

### Deliverable
PR with working scaffold — dark page, all deps, all config, type definitions, empty directory structure.

---

## Phase 1: Data Layer & Physics Engine `phase-1/physics`

**Goal**: All planet/object data defined. Physics engine produces correct results. Zero rendering.

### Tasks
- [x] `src/lib/planets.ts` — All 8 celestial bodies: Earth, Moon, Mars, Jupiter, Sun, Pluto, Europa, Titan. Each with gravity (m/s²), relative gravity, UI color, surface color, sky color, emoji, light color temperature, 3-5 fun facts
- [x] `src/lib/objects.ts` — All 6 droppable objects: bowling ball, feather, watermelon, elephant, astronaut, school bus. Each with mass, model path, scale, fallback color, emoji, squash-stretch parameters
- [x] `src/lib/physics.ts` — Pure functions (no React, no Three.js):
  - `calculatePosition(gravity, time, dropHeight)` → y position
  - `calculateVelocity(gravity, time)` → current speed
  - `calculateFallDuration(gravity, dropHeight)` → seconds to impact
  - `calculateTimeScale(gravity)` → multiplier (Earth drops ~2.5s from 20m, others proportional)
  - `calculateBounce(impactVelocity, restitution, bounceIndex)` → `{ height, duration }`
  - `calculateSquash(velocity, maxVelocity)` → `{ scaleX, scaleY, scaleZ }`
- [x] Validation: temporary test page or console output confirming fall durations for all 8 bodies are reasonable (Earth ~2.5s, Moon ~6s, Jupiter ~1.6s, Sun ~0.5s)

### Deliverable
PR with complete data definitions and a validated physics engine. Can be reviewed by reading the code and checking the math.

---

## Phase 2: Minimal 3D Scene (Placeholder Geometry) `phase-2/3d-scene`

**Goal**: Two panels side-by-side, each with a colored ground plane and a colored box that falls when you click DROP IT. Physics are real. No real models — just colored shapes.

### Tasks
- [x] `src/contexts/DropContext.tsx` — React context for shared state: selected planets (left/right), selected object, drop state (`idle` | `ready` | `dropping` | `bouncing` | `landed`), synchronized timestamp
- [x] `src/hooks/useGravitySim.ts` — Connects `physics.ts` to R3F `useFrame`. Takes gravity + drop height + state. Returns position, velocity, progress, impact velocity. Uses time-scaled delta.
- [x] `src/components/Scene.tsx` — R3F `<Canvas>` wrapper, loaded via `next/dynamic` with `ssr: false`. Sets camera, background color
- [x] `src/components/ComparisonView.tsx` — Single Canvas with drei `<View>` for scissor-rendered split-screen. Two refs tracking left/right DOM panels
- [x] `src/components/PlanetSurface.tsx` — `<mesh>` with `<planeGeometry>` colored by planet's surface color
- [x] `src/components/DroppableObject.tsx` — `<mesh>` with `<boxGeometry>` colored by object's fallback color. Position driven by `useGravitySim`
- [x] `src/components/DropButton.tsx` — Triggers both simulations simultaneously via DropContext
- [x] Wire up in `page.tsx`: `<ComparisonView>` + `<DropButton>`, hardcode Earth/Moon as defaults
- [x] Basic lighting: ambient + directional with shadows on ground plane

### Architecture note
Using a **single R3F Canvas with drei `<View>`** (scissor rendering) instead of two separate Canvas elements. This halves GPU memory and makes sync trivial.

### Deliverable
PR where you can open the app, see two colored planes with a box above each, press DROP IT, and watch them fall at different rates. Moon box takes noticeably longer than Earth box.

---

## Phase 3: UI Shell & Selectors `phase-3/ui-shell`

**Goal**: Fully interactive UI. Pick any planet for either side, pick any object, drop, see live HUD, read fun facts. Still placeholder geometry, but feature-complete interaction.

### Tasks
- [x] `src/components/PlanetSelector.tsx` — Horizontal scrollable row of planet cards below each scene panel. Emoji + name + gravity. Framer Motion spring on hover/tap. Selected card gets colored border glow
- [x] `src/components/ObjectPicker.tsx` — Shared grid of object cards (2x3 or horizontal scroll). Emoji + name + mass. Framer Motion selection spring
- [x] `src/components/HUD.tsx` — Per-panel overlay: current speed (m/s), height remaining (m), surface gravity label. Updates every frame from simulation state
- [x] `src/components/FunFact.tsx` — Appears after both objects land. Random fact from planet's array. Framer Motion `AnimatePresence` fade-in
- [x] Responsive layout in `ComparisonView.tsx`:
  - Desktop (1024px+): `flex-row`, each side 50%
  - Mobile (<768px): `flex-col`, stacked
- [x] Reset flow: "Try Again" button returns to idle state
- [x] Polish `layout.tsx` / `page.tsx`: proper spacing, remove any leftover boilerplate

### Deliverable
PR with full end-to-end user flow. Select Mars + Europa, pick watermelon, DROP IT, watch boxes fall at different rates with live HUD, see fun fact. Reset and try again. Works on desktop and mobile viewports.

---

## Phase 4: 3D Assets & Visual Fidelity `phase-4/visuals`

**Goal**: Replace all placeholder geometry with real GLTF models, PBR planet surfaces, HDR environment maps, and post-processing. The visual quality leap.

### Track A: Asset Acquisition & Processing
- [ ] Source GLTF models for all 6 objects (Sketchfab CC-licensed or generated). Process with `gltf-transform`: normalize scale, Draco compress, verify PBR channels. Place in `public/models/` *(deferred — using procedural geometry with PBR materials for now)*
- [ ] Download NASA/JPL planet surface textures (public domain). Generate normal maps. Place in `public/textures/planets/{planet-id}/` with albedo, normal, roughness maps *(deferred — using procedural bump maps for now)*
- [ ] Source HDR star field from Poly Haven (CC0). Color-grade per planet. Place in `public/textures/hdri/` *(replaced with drei Stars component for airless bodies)*
- [ ] Copy Draco WASM decoder files to `public/draco/`
- [ ] Create `src/lib/assets.ts` — manifest mapping planet IDs → texture paths, object IDs → model paths

### Track B: Rendering Upgrade
- [x] `DroppableObject.tsx`: per-object procedural geometry with PBR materials (sphere for bowling ball, capsule+sphere for elephant, box+cylinders for school bus, etc.) with meshPhysicalMaterial clearcoat on glossy objects
- [x] `PlanetSurface.tsx`: procedural bump-mapped terrain with per-planet material properties (roughness, metalness, emissive for Sun). Moon craters, Mars ridges, Europa ice cracks
- [x] Per-planet lighting: tinted ambient + directional with color temperature, rim light for visual pop, `<ContactShadows>` for grounding
- [x] Starfield via drei `<Stars>` for airless bodies (Moon, Europa, Pluto)
- [x] `src/components/PostProcessing.tsx`: `<EffectComposer>` with bloom (stronger on Sun) and vignette
- [ ] Quality toggle component (High/Med/Low) stored in `localStorage`. High = full effects, Low = no post-processing + smaller textures
- [ ] `src/components/LoadingScreen.tsx` — drei `useProgress` with branded loading bar

### Deliverable
PR where the app looks dramatically different — real bowling balls, Moon craters, HDR reflections, cinematic lighting. Post-processing adds depth. Quality toggle works.

---

## Phase 5: Animation & Cartoon Feel `phase-5/animations`

**Goal**: Every state has motion. Impacts are satisfying. The app feels like a living cartoon world.

### Tasks (in order of visual impact)
- [x] **Idle bobbing**: drei `<Float>` on objects before drop. Gentle bob + slow rotation
- [x] **Impact squash + spring-back**: `src/lib/springPhysics.ts` — damped spring solver. On impact: flatten proportional to velocity, spring back with overshoot. Volume-preserving (scaleXZ = 1/sqrt(scaleY))
- [x] **Squash-stretch during fall**: elongate Y, compress XZ proportional to current velocity
- [x] **Anticipation wind-up**: ~200ms downward squash before releasing into fall
- [ ] **Diminishing bounces**: 2-4 bounces per gravity, each with squash-stretch. Uses `physics.calculateBounce` *(deferred — squash spring recovery provides bounce feel)*
- [x] **Jelly wobble settle**: decaying sine oscillation on scale after final bounce (~500ms)
- [x] **UI animations (Framer Motion)**:
  - Planet selector: spring bounce hover, breathing glow on selected
  - Object picker: wiggle on hover, pop on select
  - DROP IT button: pulsing when ready, slam-down on press
  - Fun facts: slide-up with spring bounce
- [x] **Screen shake**: `src/hooks/useScreenShake.ts` — decaying sinusoidal offset. Intensity scales with impact velocity. Big on Jupiter/Sun, none on Pluto
- [ ] **Planet transition morph**: cross-fade ground textures + sky environment over ~600ms with camera drift. No hard cuts *(deferred to Phase 4 when real textures exist)*
- [ ] **Ambient scene particles**: Mars dust drift, Europa ice sparkles, twinkling stars, platform glow pulse *(deferred to Phase 4)*

### Animation easing
- Spring physics everywhere. No linear or basic ease-in/ease-out
- Framer Motion baseline: `type: "spring", stiffness: 300, damping: 20`
- Three.js: `MathUtils.damp` or custom spring solver in render loop

### Deliverable
PR where the app feels alive. Objects bob, slam, bounce, wobble. UI springs on every interaction. Screen shakes on Jupiter. Planet switches morph smoothly.

---

## Phase 6: Performance, Polish & Deploy `phase-6/deploy`

**Goal**: Production-ready. Passes performance budget. Live on Vercel.

### Tasks
- [x] Visual polish: CSS vignette overlays per-panel (View-compatible replacement for removed EffectComposer)
- [x] Per-planet atmospheric fog for depth
- [x] Enhanced lighting: hemisphere light, fill light from below, stronger rim light
- [x] Ambient scene particles: Mars dust, Sun embers, Europa ice sparkles, Titan haze, Jupiter gas wisps, Pluto frost
- [x] Richer planet surfaces: procedural color maps with terrain variation, higher subdivision (128x128), secondary color blending
- [x] Accessibility: `aria-label` on all interactive elements, `role="radiogroup"` on selectors, `aria-live="polite"` on HUD, `prefers-reduced-motion` disables screen shake
- [x] Verify Three.js loads only via dynamic import (not in initial bundle)
- [x] `pnpm build` → verify static export in `out/`
- [ ] Lighthouse audit: target 90+ Performance, FCP <2s, TTI <3s
- [ ] Create OG image (`public/og-image.png`)
- [ ] Deploy to Vercel: `vercel --prod` under inkOrange team
- [ ] Verify production URL loads and works

### Deliverable
Final PR. Production URL is live, loads fast, works on desktop + iPad, no console errors.

---

## File Map

```
src/
├── app/
│   ├── layout.tsx              # Root layout, Nunito font, metadata
│   ├── page.tsx                # Main app — ComparisonView + controls
│   └── globals.css             # Tailwind + space theme CSS vars
├── components/
│   ├── Scene.tsx               # R3F Canvas wrapper (dynamic, ssr: false)
│   ├── ComparisonView.tsx      # Split-screen with drei <View>
│   ├── PlanetSurface.tsx       # Ground plane (placeholder → PBR terrain)
│   ├── DroppableObject.tsx     # Falling object (placeholder → GLTF)
│   ├── PlanetSelector.tsx      # Planet carousel
│   ├── ObjectPicker.tsx        # Object grid
│   ├── HUD.tsx                 # Live speed/height/gravity overlay
│   ├── FunFact.tsx             # Post-impact planet fact
│   ├── DropButton.tsx          # "DROP IT!" trigger
│   ├── PostProcessing.tsx      # SSAO + bloom + tone mapping
│   └── LoadingScreen.tsx       # Asset loading progress
├── contexts/
│   └── DropContext.tsx          # Shared drop state + selection
├── hooks/
│   ├── useGravitySim.ts        # Physics → useFrame bridge
│   ├── useDropState.ts         # Drop state machine
│   └── useScreenShake.ts       # Impact camera/viewport shake
├── lib/
│   ├── physics.ts              # Pure Newtonian kinematics
│   ├── springPhysics.ts        # Damped spring solver
│   ├── planets.ts              # 8 celestial bodies data
│   ├── objects.ts              # 6 droppable objects data
│   ├── assets.ts               # Model/texture path manifest
│   └── constants.ts            # Shared constants
└── types/
    └── index.ts                # TypeScript interfaces
```
