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
    <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none">
      <div className="flex flex-col gap-1 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-mono">
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
