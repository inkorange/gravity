"use client";

import { useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { PlanetScene } from "./PlanetScene";
import { PlanetSelector } from "./PlanetSelector";
import { HUD } from "./HUD";
import { FunFact } from "./FunFact";
import { useDropContext } from "@/contexts/DropContext";
import { useScreenShake } from "@/hooks/useScreenShake";
import { getPlanetById } from "@/lib/planets";
import { getObjectById } from "@/lib/objects";
import { getMaxVelocity } from "@/lib/physics";

export function ComparisonView() {
  const {
    leftPlanetId,
    rightPlanetId,
    objectId,
    phase,
    land,
    setLeftPlanet,
    setRightPlanet,
  } = useDropContext();

  const leftRef = useRef<HTMLDivElement>(null!);
  const rightRef = useRef<HTMLDivElement>(null!);
  const canvasContainerRef = useRef<HTMLDivElement>(null!);
  const { containerRef: shakeRef, trigger: triggerShake } = useScreenShake();

  const leftPlanet = getPlanetById(leftPlanetId)!;
  const rightPlanet = getPlanetById(rightPlanetId)!;
  const selectedObject = getObjectById(objectId)!;

  const landedCount = useRef(0);

  const handleLandWithShake = useCallback((gravity: number) => {
    const maxVel = getMaxVelocity(gravity);
    const intensity = Math.min(maxVel / getMaxVelocity(274), 1);
    triggerShake(intensity);

    landedCount.current += 1;
    if (landedCount.current >= 2) {
      land();
      landedCount.current = 0;
    }
  }, [land, triggerShake]);

  const handleLeftLand = useCallback(() => {
    handleLandWithShake(leftPlanet.gravity);
  }, [handleLandWithShake, leftPlanet.gravity]);

  const handleRightLand = useCallback(() => {
    handleLandWithShake(rightPlanet.gravity);
  }, [handleLandWithShake, rightPlanet.gravity]);

  if (phase === "idle") {
    landedCount.current = 0;
  }

  return (
    <div ref={shakeRef} className="flex flex-col flex-1 min-h-0">
      {/* Scene area — flex layout so drei View can measure correctly */}
      <div
        ref={canvasContainerRef}
        className="relative flex flex-1 flex-col md:flex-row min-h-0"
      >
        {/* Left panel wrapper — contains tracking div + selector */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div ref={leftRef} className="relative flex-1 min-h-0 overflow-hidden">
            <HUD side="left" planet={leftPlanet} />
            <FunFact planet={leftPlanet} phase={phase} />
            <div
              className="absolute inset-0 pointer-events-none z-[1]"
              style={{
                background: `radial-gradient(ellipse at center, transparent 50%, ${leftPlanet.skyColor}90 100%)`,
              }}
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 z-20">
            <PlanetSelector
              selectedId={leftPlanetId}
              onSelect={setLeftPlanet}
              side="left"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px bg-white/10 z-10" />
        <div className="block md:hidden h-px bg-white/10 z-10" />

        {/* Right panel wrapper — contains tracking div + selector */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div ref={rightRef} className="relative flex-1 min-h-0 overflow-hidden">
            <HUD side="right" planet={rightPlanet} />
            <FunFact planet={rightPlanet} phase={phase} />
            <div
              className="absolute inset-0 pointer-events-none z-[1]"
              style={{
                background: `radial-gradient(ellipse at center, transparent 50%, ${rightPlanet.skyColor}90 100%)`,
              }}
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 z-20">
            <PlanetSelector
              selectedId={rightPlanetId}
              onSelect={setRightPlanet}
              side="right"
            />
          </div>
        </div>

        {/* Single Canvas spanning both panels */}
        <Canvas
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
          shadows
          camera={{ position: [0, 5, 12], fov: 50 }}
          eventSource={canvasContainerRef}
        >
          <View track={leftRef}>
            <PlanetScene
              planet={leftPlanet}
              object={selectedObject}
              phase={phase}
              side="left"
              onLand={handleLeftLand}
            />
          </View>
          <View track={rightRef}>
            <PlanetScene
              planet={rightPlanet}
              object={selectedObject}
              phase={phase}
              side="right"
              onLand={handleRightLand}
            />
          </View>
        </Canvas>
      </div>
    </div>
  );
}
