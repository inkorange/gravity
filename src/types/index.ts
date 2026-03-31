export interface CelestialBody {
  id: string;
  name: string;
  gravity: number;
  relativeGravity: number;
  color: string;
  surfaceColor: string;
  skyColor: string;
  emoji: string;
  lightTemp: "warm" | "neutral" | "cool";
  funFacts: string[];
}

export interface DroppableObject {
  id: string;
  name: string;
  emoji: string;
  mass: number;
  modelPath: string;
  scale: number;
  fallbackColor: string;
  squashFactor: number;
  restitution: number; // bounce coefficient (0 = no bounce, 1 = perfect bounce)
}

export type DropPhase = "idle" | "ready" | "anticipation" | "dropping" | "bouncing" | "landed";

export interface SimulationState {
  phase: DropPhase;
  elapsed: number;
  position: number;
  velocity: number;
  impactVelocity: number;
  bounceIndex: number;
}
