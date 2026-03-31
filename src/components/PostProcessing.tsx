"use client";

import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

interface PostProcessingProps {
  planetId: string;
}

// Sun gets stronger bloom for lava glow effect
const BLOOM_INTENSITY: Record<string, number> = {
  sun: 0.8,
  jupiter: 0.3,
  titan: 0.3,
};

export function PostProcessing({ planetId }: PostProcessingProps) {
  const bloomIntensity = BLOOM_INTENSITY[planetId] ?? 0.2;

  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.8}
        luminanceSmoothing={0.3}
        intensity={bloomIntensity}
      />
      <Vignette eskil={false} offset={0.1} darkness={0.4} />
    </EffectComposer>
  );
}
