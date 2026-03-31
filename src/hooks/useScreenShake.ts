"use client";

import { useRef, useEffect, useCallback } from "react";

interface ShakeState {
  active: boolean;
  startTime: number;
  intensity: number;
  duration: number;
}

/**
 * Returns a ref to attach to a container element and a trigger function.
 * When triggered, applies a decaying sinusoidal shake via CSS transform.
 */
export function useScreenShake() {
  const containerRef = useRef<HTMLDivElement>(null);
  const shakeState = useRef<ShakeState>({
    active: false,
    startTime: 0,
    intensity: 0,
    duration: 0,
  });
  const rafId = useRef<number>(0);

  const animate = useCallback(() => {
    const el = containerRef.current;
    const state = shakeState.current;
    if (!el || !state.active) return;

    const elapsed = (performance.now() - state.startTime) / 1000;
    if (elapsed > state.duration) {
      el.style.transform = "";
      state.active = false;
      return;
    }

    const progress = elapsed / state.duration;
    const decay = 1 - progress;
    const frequency = 15;
    const x = Math.sin(elapsed * frequency * Math.PI * 2) * state.intensity * decay;
    const y = Math.cos(elapsed * frequency * 1.3 * Math.PI * 2) * state.intensity * decay * 0.7;

    el.style.transform = `translate(${x}px, ${y}px)`;
    rafId.current = requestAnimationFrame(animate);
  }, []);

  const trigger = useCallback(
    (intensity: number) => {
      if (intensity < 0.05) return; // Skip shake for very low gravity impacts
      // Respect prefers-reduced-motion
      if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      shakeState.current = {
        active: true,
        startTime: performance.now(),
        intensity: intensity * 8, // Scale to pixels
        duration: 0.3 + intensity * 0.3,
      };
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(animate);
    },
    [animate]
  );

  useEffect(() => {
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  return { containerRef, trigger };
}
