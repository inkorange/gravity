"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { planets } from "@/lib/planets";

interface PlanetSelectorProps {
  selectedId: string;
  onSelect: (id: string) => void;
  side: "left" | "right";
}

const ITEM_WIDTH_DESKTOP = 120;
const ITEM_WIDTH_MOBILE = 60;
const CENTER_SCALE = 1.5;
const MIN_SCALE = 0.4;
const MIN_OPACITY = 0.2;
const FALLOFF = 300;
const DEBOUNCE_MS = 600;

function getItemWidth() {
  if (typeof window === "undefined") return ITEM_WIDTH_DESKTOP;
  return window.innerWidth < 768 ? ITEM_WIDTH_MOBILE : ITEM_WIDTH_DESKTOP;
}

function getTargetOffset(index: number) {
  const w = getItemWidth();
  return -index * w - w / 2;
}

export function PlanetSelector({ selectedId, onSelect, side }: PlanetSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const offsetAtDragStart = useRef(0);
  const lastVelocity = useRef(0);
  const lastDragX = useRef(0);
  const lastDragTime = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const clickTargetIndex = useRef<number | null>(null);
  const animFrameRef = useRef<number>(0);

  const [visualId, setVisualId] = useState(selectedId);

  // Track position with state so React re-renders and CSS transition handles animation
  const selectedIndex = planets.findIndex(p => p.id === selectedId);
  const [trackOffset, setTrackOffset] = useState(() => getTargetOffset(selectedIndex));
  const [isAnimating, setIsAnimating] = useState(true); // enable CSS transition

  // Sync when parent changes selectedId
  useEffect(() => {
    setIsAnimating(true);
    setTrackOffset(getTargetOffset(planets.findIndex(p => p.id === selectedId)));
    setVisualId(selectedId);
  }, [selectedId]);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    dragStartX.current = e.clientX;
    offsetAtDragStart.current = trackOffset;
    lastDragX.current = e.clientX;
    lastDragTime.current = Date.now();
    lastVelocity.current = 0;
    setIsAnimating(false); // disable transition during drag

    const el = (e.target as HTMLElement).closest("[data-planet-index]");
    clickTargetIndex.current = el ? Number(el.getAttribute("data-planet-index")) : null;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;

    const dx = e.clientX - dragStartX.current;
    const now = Date.now();
    const dt = now - lastDragTime.current;

    if (dt > 0) {
      lastVelocity.current = (e.clientX - lastDragX.current) / dt * 1000;
    }
    lastDragX.current = e.clientX;
    lastDragTime.current = now;

    setTrackOffset(offsetAtDragStart.current + dx);
  };

  const handlePointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsAnimating(true); // re-enable transition for snap

    const currentOffset = offsetAtDragStart.current + (lastDragX.current - dragStartX.current);
    const dragDistance = Math.abs(currentOffset - offsetAtDragStart.current);

    // Tap — clicked a planet
    if (dragDistance <= 5 && clickTargetIndex.current !== null) {
      const index = clickTargetIndex.current;
      clickTargetIndex.current = null;
      setTrackOffset(getTargetOffset(index));
      setVisualId(planets[index].id);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      onSelect(planets[index].id);
      return;
    }

    clickTargetIndex.current = null;

    // Drag — snap to nearest with momentum
    const momentum = lastVelocity.current * 0.15;
    const projected = currentOffset + momentum;

    const w = getItemWidth();
    const rawIndex = -(projected + w / 2) / w;
    const snappedIndex = Math.round(Math.max(0, Math.min(planets.length - 1, rawIndex)));

    setTrackOffset(getTargetOffset(snappedIndex));
    setVisualId(planets[snappedIndex].id);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onSelect(planets[snappedIndex].id);
    }, DEBOUNCE_MS);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[72px] md:h-[180px] overflow-visible cursor-grab active:cursor-grabbing select-none"
      style={{
        background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      role="radiogroup"
      aria-label={`${side} planet selector`}
    >
      {/* Center indicator line */}
      <div className="absolute left-1/2 top-1 bottom-1 w-[3px] -translate-x-1/2 rounded-full bg-white/10 pointer-events-none z-0" />

      {/* Scrolling track */}
      <div
        className="absolute bottom-0 flex items-end pb-2 md:pb-3"
        style={{
          left: "50%",
          transform: `translateX(${trackOffset}px)`,
          transition: isAnimating ? "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)" : "none",
        }}
      >
        {planets.map((planet, index) => (
          <PlanetItem
            key={planet.id}
            index={index}
            planet={planet}
            isSelected={planet.id === visualId}
            trackOffset={trackOffset}
          />
        ))}
      </div>
    </div>
  );
}

interface PlanetItemProps {
  index: number;
  planet: (typeof planets)[number];
  isSelected: boolean;
  trackOffset: number;
}

function PlanetItem({ index, planet, isSelected, trackOffset }: PlanetItemProps) {
  const w = getItemWidth();
  const isMobile = w < ITEM_WIDTH_DESKTOP;
  const dist = index * w + w / 2 + trackOffset;
  const absDist = Math.abs(dist);
  const t = Math.min(absDist / FALLOFF, 1);

  const scale = CENTER_SCALE - (CENTER_SCALE - MIN_SCALE) * t * t;
  const opacity = 1 - (1 - MIN_OPACITY) * t * t;
  const yOffset = t * t * 12;
  const rotate = Math.max(-1, Math.min(1, dist / FALLOFF)) * -20;

  const circleSize = isMobile ? 32 : 64;
  const glowSize = isMobile ? 40 : 80;

  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        width: w,
        transform: `scale(${scale}) translateY(${yOffset}px) perspective(600px) rotateY(${rotate}deg)`,
        opacity,
        transition: "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
      }}
      data-planet-index={index}
    >
      {isSelected && (
        <div
          className="absolute rounded-full pointer-events-none animate-pulse"
          style={{
            width: glowSize,
            height: glowSize,
            backgroundColor: planet.color,
            opacity: 0.25,
            filter: "blur(20px)",
          }}
        />
      )}

      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: circleSize,
          height: circleSize,
          backgroundColor: isSelected ? planet.color + "30" : "rgba(255,255,255,0.06)",
          borderWidth: 2,
          borderColor: isSelected ? planet.color : "rgba(255,255,255,0.1)",
          transition: "background-color 0.3s, border-color 0.3s",
        }}
      >
        <span className={`${isMobile ? "text-sm" : "text-3xl"} leading-none select-none`}>{planet.emoji}</span>
      </div>

      <span
        className={`${isMobile ? "text-[9px] mt-0.5" : "text-sm mt-2"} font-bold leading-tight whitespace-nowrap`}
        style={{
          color: isSelected ? planet.color : "rgba(255,255,255,0.6)",
          transition: "color 0.3s",
        }}
      >
        {planet.name}
      </span>
      <span className={`${isMobile ? "text-[8px]" : "text-xs"} text-white/35 leading-tight`}>
        {planet.relativeGravity}g
      </span>
    </div>
  );
}
