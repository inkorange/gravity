import type { DroppableObject } from "@/types";

export const objects: DroppableObject[] = [
  {
    id: "bowling-ball",
    name: "Bowling Ball",
    emoji: "🎳",
    mass: 7,
    modelPath: "/models/bowling-ball.glb",
    scale: 0.3,
    fallbackColor: "#4a0080",
    squashFactor: 0.3,
  },
  {
    id: "feather",
    name: "Feather",
    emoji: "🪶",
    mass: 0.003,
    modelPath: "/models/feather.glb",
    scale: 0.4,
    fallbackColor: "#ffffff",
    squashFactor: 0.8,
  },
  {
    id: "watermelon",
    name: "Watermelon",
    emoji: "🍉",
    mass: 5,
    modelPath: "/models/watermelon.glb",
    scale: 0.35,
    fallbackColor: "#2d8a2d",
    squashFactor: 0.6,
  },
  {
    id: "elephant",
    name: "Elephant",
    emoji: "🐘",
    mass: 5000,
    modelPath: "/models/elephant.glb",
    scale: 0.8,
    fallbackColor: "#808080",
    squashFactor: 0.25,
  },
  {
    id: "astronaut",
    name: "Astronaut",
    emoji: "👨‍🚀",
    mass: 80,
    modelPath: "/models/astronaut.glb",
    scale: 0.6,
    fallbackColor: "#e0e0e0",
    squashFactor: 0.4,
  },
  {
    id: "school-bus",
    name: "School Bus",
    emoji: "🚌",
    mass: 11000,
    modelPath: "/models/school-bus.glb",
    scale: 1.0,
    fallbackColor: "#ffcc00",
    squashFactor: 0.2,
  },
];

export function getObjectById(id: string): DroppableObject | undefined {
  return objects.find((o) => o.id === id);
}
