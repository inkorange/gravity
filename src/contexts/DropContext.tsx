"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { DropPhase } from "@/types";

interface DropState {
  leftPlanetId: string;
  rightPlanetId: string;
  objectId: string;
  phase: DropPhase;
  dropTimestamp: number;
}

interface DropContextValue extends DropState {
  setLeftPlanet: (id: string) => void;
  setRightPlanet: (id: string) => void;
  setObject: (id: string) => void;
  drop: () => void;
  reset: () => void;
  land: () => void;
}

const DropContext = createContext<DropContextValue | null>(null);

export function DropProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DropState>({
    leftPlanetId: "earth",
    rightPlanetId: "moon",
    objectId: "bowling-ball",
    phase: "idle",
    dropTimestamp: 0,
  });

  const setLeftPlanet = useCallback((id: string) => {
    setState((s) => ({ ...s, leftPlanetId: id }));
  }, []);

  const setRightPlanet = useCallback((id: string) => {
    setState((s) => ({ ...s, rightPlanetId: id }));
  }, []);

  const setObject = useCallback((id: string) => {
    setState((s) => ({ ...s, objectId: id }));
  }, []);

  const drop = useCallback(() => {
    // Enter anticipation phase first, then start dropping after a short delay
    setState((s) => ({
      ...s,
      phase: "anticipation",
      dropTimestamp: performance.now(),
    }));
    setTimeout(() => {
      setState((s) => {
        if (s.phase !== "anticipation") return s;
        return { ...s, phase: "dropping", dropTimestamp: performance.now() };
      });
    }, 200);
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({ ...s, phase: "idle", dropTimestamp: 0 }));
  }, []);

  const land = useCallback(() => {
    setState((s) => ({ ...s, phase: "landed" }));
  }, []);

  return (
    <DropContext.Provider
      value={{
        ...state,
        setLeftPlanet,
        setRightPlanet,
        setObject,
        drop,
        reset,
        land,
      }}
    >
      {children}
    </DropContext.Provider>
  );
}

export function useDropContext(): DropContextValue {
  const ctx = useContext(DropContext);
  if (!ctx) throw new Error("useDropContext must be used within DropProvider");
  return ctx;
}
