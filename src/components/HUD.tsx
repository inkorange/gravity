"use client";

import { useSimData } from "@/hooks/useSimStore";
import type { CelestialBody } from "@/types";

interface HUDProps {
  side: "left" | "right";
  planet: CelestialBody;
}

export function HUD({ side, planet }: HUDProps) {
  const sim = useSimData(side);

  return (
    <div className="absolute top-1.5 left-1.5 right-1.5 md:top-3 md:left-3 md:right-3 z-10 pointer-events-none" role="status" aria-live="polite" aria-label={`${side} panel telemetry`}>
      <div className="flex flex-col gap-0.5 md:gap-1 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1 md:px-3 md:py-2 text-[10px] md:text-sm font-mono">
        <div className="flex justify-between">
          <span className="text-white/50">Speed</span>
          <span className="text-white font-bold">
            {sim.velocity.toFixed(1)} m/s
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Height</span>
          <span className="text-white font-bold">
            {sim.position.toFixed(1)} m
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Gravity</span>
          <span className="font-bold" style={{ color: planet.color }}>
            {planet.gravity} m/s²
          </span>
        </div>
        {sim.landed && sim.impactVelocity > 0 && (
          <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
            <span className="text-white/50">Impact</span>
            <span className="text-red-400 font-bold">
              {sim.impactVelocity.toFixed(1)} m/s
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
