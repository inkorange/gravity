# Gravity Playground

An interactive 3D web app that teaches elementary-aged kids (8-12) how gravity works across different planets and moons in our solar system. Kids select two celestial bodies side-by-side, drop objects, and watch how gravity behaves differently on each. The experience is playful, visual, and grounded in real physics.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **3D Engine**: Three.js (r128+ via npm, not CDN) with PBR materials and GLTF models
- **Animation**: Framer Motion (UI transitions), Three.js animation loop (physics), `@react-three/drei` (Float, useAnimations) for idle/ambient 3D animations
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (inkOrange team: `team_H6LlOofXMSjnfKENSnEmpgMY`)
- **Package Manager**: pnpm

## Project Structure

```
gravity-playground/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout, fonts, metadata
│   │   ├── page.tsx            # Main app entry
│   │   └── globals.css         # Tailwind base + custom properties
│   ├── components/
│   │   ├── Scene.tsx           # Main Three.js canvas wrapper
│   │   ├── PlanetSurface.tsx   # 3D ground plane + sky for a given body
│   │   ├── DroppableObject.tsx # 3D object that responds to gravity
│   │   ├── PlanetSelector.tsx  # Horizontal carousel of celestial bodies
│   │   ├── ObjectPicker.tsx    # Grid of droppable objects to choose from
│   │   ├── ComparisonView.tsx  # Side-by-side split-screen layout
│   │   ├── HUD.tsx             # Speedometer, height tracker, gravity label
│   │   ├── FunFact.tsx         # Bite-sized facts per planet
│   │   └── DropButton.tsx      # Big "DROP IT!" button
│   ├── lib/
│   │   ├── physics.ts          # Gravity simulation math
│   │   ├── planets.ts          # Planet/moon data (gravity, colors, facts)
│   │   ├── objects.ts          # Droppable object definitions (mass, geometry)
│   │   └── constants.ts        # Shared constants
│   ├── hooks/
│   │   ├── useGravitySim.ts    # Physics loop hook
│   │   └── useDropState.ts     # Drop state machine (idle, falling, landed)
│   └── types/
│       └── index.ts            # Shared TypeScript types
├── public/
│   ├── textures/
│   │   ├── planets/            # PBR texture sets per planet (albedo, normal, roughness, displacement)
│   │   └── hdri/               # HDR environment maps per planet/scene
│   ├── models/                 # GLTF/GLB models for all droppable objects (Draco-compressed)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Core Feature: Side-by-Side Planet Comparison

This is the primary (and only v1) interaction mode. The screen splits into two panels, each showing a different celestial body. The user selects a planet/moon for each side independently, picks an object, and drops it on both simultaneously.

### User Flow

1. App loads with Earth on the left, Moon on the right (sensible default)
2. User taps a planet selector on either side to change the celestial body
3. User picks an object from a shared object picker (bowling ball, feather, watermelon, elephant, astronaut, school bus)
4. User hits the "DROP IT!" button
5. The same object drops from the same height on both sides simultaneously
6. Real-time HUD on each side shows: current speed (m/s), height remaining (m), surface gravity (g)
7. Object hits the ground with a visual impact effect (dust cloud, bounce, squash-and-stretch)
8. A fun fact about the selected planet appears after impact
9. User can reset and try again with different objects or planets

### Physics

All gravity values are real. The simulation uses simple Newtonian kinematics:

```
velocity = velocity + (gravity * deltaTime)
position = position - (velocity * deltaTime)
```

No air resistance (we're in space, mostly). The simulation should feel real but be visually exaggerated enough to be satisfying. Objects should not fall at actual real-time speed on low-gravity bodies (that would be boring). Use a time multiplier that keeps the experience snappy while preserving the relative differences between planets.

**Time scale strategy**: Normalize so that Earth drops take about 2-3 seconds from a reasonable height. Other planets scale proportionally. This means the Moon drop takes longer and Jupiter drops faster, but nothing drags on.

## Visual Quality Directive

**The graphics must be a standout feature.** This app should look impressive — detailed 3D models, realistic PBR textures, and cinematic rendering. The visual fidelity is what will make kids (and teachers) stop and pay attention. At the same time, the overall feel should be **cartoon-like and inviting** — think Pixar meets science class. Realistic materials and lighting, but exaggerated, playful animations that give everything personality and charm.

### Rendering Pipeline
- **Materials**: All surfaces use physically-based rendering (PBR) with full texture maps: albedo, normal, roughness, metalness, and ambient occlusion. No flat colors or untextured geometry.
- **Post-processing**: EffectComposer with SSAO (depth/realism), subtle bloom (emissive elements like lava on Sun, platform lights), and optional tone mapping.
- **Environment**: HDR environment maps per planet for accurate reflections and IBL. Airless bodies get a high-res star field cubemap.
- **Shadows**: Soft shadow maps on all objects. Ground contact shadows are critical for grounding objects in the scene.
- **Particles**: GPU-based particle systems for impact dust, atmospheric particles (Titan's haze, Mars dust), and platform effects.

### Animation & Cartoon Feel

The app should feel alive at all times — nothing should ever be static. Animations are exaggerated and springy, inspired by cartoon physics (Pixar/Looney Tunes energy).

#### Object Animations
- **Idle bobbing**: Before a drop, the selected object floats above the platform with a gentle bob and slow rotation (drei `Float` component). Gives it a weightless, playful feel.
- **Anticipation on drop**: Brief upward "wind-up" squash before falling (classic animation principle). The object compresses slightly, then stretches vertically as it accelerates.
- **Squash-and-stretch on fall**: Objects elongate slightly in the direction of travel while falling. More exaggerated on high-gravity planets (Jupiter), subtle on low-gravity (Pluto).
- **Impact squash**: On landing, objects flatten dramatically (cartoon pancake effect), then spring back to shape with overshoot/bounce. The squash intensity scales with impact velocity — a Jupiter slam is a full pancake, a Pluto landing is a gentle compress.
- **Post-impact bounce**: A few diminishing bounces with squash-and-stretch on each. The bounce height and count vary by gravity.
- **Wobble settle**: After the final bounce, objects do a jelly-like wobble before coming to rest.

#### Scene & Environment Animations
- **Planet surfaces**: Subtle ambient motion — dust particles drifting on Mars, ice crystals sparkling on Europa, heat shimmer on the Sun's platform, gentle cloud wisps on Titan.
- **Stars twinkle**: Background star field has gentle twinkling/pulsing.
- **Platform glow**: The drop platform has a pulsing emissive edge glow that intensifies when an object is selected and ready to drop.
- **Planet transition**: When switching planets, the ground and sky morph/dissolve with a satisfying whoosh — not a hard cut. Camera does a subtle drift during the transition.

#### UI Animations (Framer Motion)
- **Planet selector**: Cards scale up with a spring bounce on hover/tap. The selected planet card has a gentle breathing glow.
- **Object picker**: Objects do a little wiggle/dance when hovered. Selected objects pop with a scale spring.
- **DROP IT! button**: Pulses with anticipation when ready. On press, it slams down with a heavy spring and triggers a radial shockwave ripple.
- **HUD numbers**: Speed and height values animate with a rolling counter effect (like an odometer). Numbers flash/pulse at key moments (max velocity, impact).
- **Fun facts**: Slide in from below with a playful bounce, accompanied by a subtle sparkle/starburst.
- **Screen shake**: On high-gravity impacts (Jupiter, Sun), the entire viewport does a brief, punchy shake. Intensity scales with gravity.

#### Animation Easing
- Use spring physics everywhere (Framer Motion springs for UI, custom spring functions for 3D). No linear or basic ease-in/ease-out — everything should feel organic and bouncy.
- Framer Motion defaults: `type: "spring", stiffness: 300, damping: 20` as a baseline, tuned per element.
- Three.js animations: Use `MathUtils.damp` or custom spring solvers for smooth, springy interpolation in the render loop.

### 3D Asset Pipeline
- Models: GLTF/GLB format, created in Blender or sourced from Sketchfab (CC-licensed). Draco-compressed for delivery.
- Textures: 2K resolution minimum for hero assets (objects, ground terrain), KTX2/Basis Universal compressed. Source from NASA imagery for planet surfaces where possible.
- Planet surfaces: Use NASA/JPL texture maps for planetary terrain — real crater maps for Moon, HiRISE imagery for Mars, Cassini data for Titan. These are public domain and add authenticity.
- Store all assets in `public/models/` and `public/textures/` with a manifest file for preloading.

## Celestial Body Data

```typescript
interface CelestialBody {
  id: string;
  name: string;
  gravity: number;         // m/s², real value
  relativeGravity: number; // relative to Earth (1.0)
  color: string;           // primary UI color
  surfaceColor: string;    // ground plane color
  skyColor: string;        // background gradient top
  emoji: string;           // for the selector
  funFacts: string[];      // 3-5 facts per body
}
```

Include these bodies:
- **Earth**: 9.81 m/s² (1.0g) — home base, reference point
- **Moon**: 1.62 m/s² (0.165g) — gray, cratered
- **Mars**: 3.72 m/s² (0.379g) — red/rust terrain
- **Jupiter**: 24.79 m/s² (2.528g) — banded gas giant (use a "floating platform" concept since there's no solid surface)
- **Sun**: 274.0 m/s² (27.94g) — extreme, used for dramatic effect
- **Pluto**: 0.62 m/s² (0.063g) — icy, tiny
- **Europa**: 1.315 m/s² (0.134g) — icy moon of Jupiter
- **Titan**: 1.352 m/s² (0.138g) — orange haze atmosphere

## Droppable Objects

Each object should be a high-detail GLTF/GLB model with realistic PBR textures (albedo, normal, roughness, metalness maps). Source or create visually rich models that look impressive and tangible — these are a centerpiece of the experience, not placeholder shapes.

```typescript
interface DroppableObject {
  id: string;
  name: string;
  emoji: string;
  mass: number;            // kg, for display only (gravity affects all equally)
  modelPath: string;        // path to GLTF/GLB model in public/models/
  scale: number;            // relative size
  fallbackColor: string;    // color for loading placeholder
}
```

Objects (all as detailed GLTF models with PBR textures):
- **Bowling Ball**: glossy resin material with finger holes, specular highlights, 7kg
- **Feather**: semi-transparent, fine barb detail via alpha texture, subtle iridescence, 0.003kg
- **Watermelon**: realistic rind with bump-mapped stripes, waxy sheen, 5kg
- **Elephant**: fully modeled with wrinkled skin (normal maps), tusks, realistic proportions, 5000kg
- **Astronaut**: detailed EVA suit with visor reflections (environment map), fabric folds, patches, 80kg
- **School Bus**: correct proportions with windows, chrome bumpers, metallic paint, tire treads, 11000kg

**Important teaching moment**: All objects fall at the same rate regardless of mass (in a vacuum). The app should surface this fact. Consider showing a "surprise" moment when the feather and bowling ball hit at the same time. This is one of the most powerful things kids can learn from this app.

## 3D Scene Setup (Three.js)

Each side of the comparison view is its own Three.js scene (or a single scene with two viewports via scissor rendering).

### Per-side scene contains:
- **Ground plane**: Large terrain mesh with high-res PBR surface textures (albedo, normal, roughness, displacement) sourced from real planetary imagery — craters on Moon, red rock on Mars, ice sheets on Europa, etc.
- **Sky**: HDR environment maps for realistic sky rendering — star fields for airless bodies, atmospheric scattering for bodies with atmospheres (Titan's orange haze, Mars' dusty pink sky)
- **Drop platform**: A detailed metallic sci-fi platform with emissive edge lighting
- **Falling object**: The selected GLTF model with full PBR materials
- **Impact effect**: GPU particle system with dust, debris chunks, and screen-space effects (camera shake, chromatic aberration flash)
- **Camera**: Perspective camera with slight depth-of-field for cinematic feel

### Lighting:
- Image-based lighting (IBL) from HDR environment maps for realistic reflections
- Directional light (sun-like) with soft shadow maps (PCF or VSM)
- Ambient occlusion (SSAO via post-processing) for grounded, realistic depth
- Rim lighting on objects for visual pop against dark backgrounds
- Per-planet light color temperature (warm yellow for Sun-side, cool blue for outer planets)

### Performance considerations:
- Use `requestAnimationFrame` properly
- Dispose of geometries, materials, and textures when switching objects/planets
- Use LOD (Level of Detail) — high-poly models up close, simplified at distance
- Compress GLTF models with Draco or meshopt; compress textures with KTX2/Basis Universal
- Use texture atlases where possible to reduce draw calls
- Target 60fps on mid-range devices; provide a quality toggle (High/Medium/Low) that adjusts shadow resolution, SSAO, and texture resolution
- Test on iPad Safari (common device for this age group)
- Lazy-load models and textures with visible loading indicators

## UI Design Guidelines

**This is for 8-12 year olds. Design accordingly.**

- **Typography**: Rounded, friendly sans-serif. Large text. No walls of text anywhere.
- **Colors**: Bright, saturated palette. Each planet gets its own color identity.
- **Touch targets**: Minimum 48px tap targets. Everything works on touch screens.
- **Layout**: Landscape-oriented on desktop, stacked vertically on mobile (left planet on top, right planet on bottom)
- **Feedback**: Every interaction has exaggerated visual feedback. Button presses slam down with spring rebound. Selections glow and pulse. Drops trigger screen shake on high-gravity planets. Nothing ever feels "dead" — even idle states have subtle motion.
- **No login, no accounts, no onboarding modals.** Open the URL and play.
- **Animations**: Everything animates — see the full **Animation & Cartoon Feel** section above. Spring physics everywhere, squash-and-stretch on objects, ambient motion in scenes. The app should feel like a living cartoon world, not a static simulation.

### Color Palette

Use a dark space-themed background with vibrant accent colors:
- Background: deep navy/black (#0a0a1a)
- Earth: blue/green (#4da6ff)
- Moon: silver/gray (#c0c0c0)
- Mars: rust/red (#e07040)
- Jupiter: orange/tan (#e0a050)
- Sun: bright yellow (#ffcc00)
- Pluto: ice blue (#a0d0e0)
- Europa: pale cyan (#80d0d0)
- Titan: amber/orange (#d09030)

### Responsive Breakpoints

- **Desktop (1024px+)**: Side-by-side split, planet selectors below each scene
- **Tablet (768px-1023px)**: Side-by-side split, slightly compressed
- **Mobile (<768px)**: Stacked vertically, top/bottom split

## Sound Effects (Optional, v1.5)

Sound enhances the experience significantly for this age group but is not required for v1. If implemented:
- Whoosh on drop
- Impact thud (pitch varies by gravity: deep on Jupiter, light tap on Moon)
- UI click sounds
- Victory/surprise sound when demonstrating feather = bowling ball speed
- All sounds should have a mute toggle

## SEO & Metadata

```typescript
metadata: {
  title: "Gravity Playground - How Does Gravity Work on Other Planets?",
  description: "Drop objects on different planets and see how gravity changes. An interactive 3D space experiment for kids.",
  openGraph: {
    title: "Gravity Playground",
    description: "What happens when you drop an elephant on Jupiter?",
    images: ["/og-image.png"]
  }
}
```

## Performance Budget

- **First Contentful Paint**: < 2s
- **Time to Interactive**: < 3s
- **Bundle size**: Three.js is heavy (~600kb min). Use dynamic imports and only load the Three.js modules actually needed. Consider `@react-three/fiber` and `@react-three/drei` for cleaner React integration, but evaluate bundle impact.
- **Lighthouse**: Target 90+ on Performance

### Three.js Import Strategy

If using raw Three.js:
```typescript
import * as THREE from 'three';
// Only import what's needed
```

If using React Three Fiber (recommended for React integration):
```typescript
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, useTexture } from '@react-three/drei';
import { EffectComposer, SSAO, Bloom } from '@react-three/postprocessing';
```

**Decision**: Use `@react-three/fiber` + `@react-three/drei` + `@react-three/postprocessing` for the full rendering pipeline. Drei provides `useGLTF` for model loading with Draco support, `Environment` for HDR IBL, and `useTexture` for PBR texture loading. Postprocessing adds SSAO, bloom, and other cinematic effects.

## Deployment

- Deploy to Vercel under the inkOrange team
- Project name: `gravity-playground`
- Domain: gravity.chriswest.tech (or gravity-playground.vercel.app)
- Enable Fluid Compute (default)
- Set reasonable `maxDuration` on any API routes (if added later)
- Static export preferred if no server-side logic is needed — avoid unnecessary serverless function invocations (see: Vercel CPU budget concerns)

## Future Features (NOT v1)

These are ideas for later versions. Do not build these now:
- Throw mode with trajectory arcs
- "How high could YOU jump?" calculator with weight input
- Sound effects
- Orbit simulator
- Multiplayer racing (who hits the ground first?)
- AR mode (drop objects in your room)
- Classroom mode with quizzes
- Achievement badges

## Development Notes

- Chris uses Claude Code and Cursor for development
- Prefer functional components with hooks
- Use TypeScript strict mode throughout
- No `any` types
- Prefer composition over inheritance
- Keep components small and focused
- Extract physics logic into pure functions (testable without React)
- Write the physics module first and validate the math before building the UI
- Use CSS custom properties for planet theming so colors cascade naturally

## Writing Style (for any copy in the app)

- Short, punchy, fun
- No jargon. "Gravity" not "gravitational acceleration"
- Use comparisons kids understand: "On Jupiter, you'd feel like you were carrying two of yourself on your back!"
- Emoji are welcome in the UI
- Exclamation marks are fine. This is exciting!