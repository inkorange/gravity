"use client";

import { motion } from "framer-motion";
import { planets } from "@/lib/planets";

interface PlanetSelectorProps {
  selectedId: string;
  onSelect: (id: string) => void;
  side: "left" | "right";
}

export function PlanetSelector({ selectedId, onSelect, side }: PlanetSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-hide">
      {planets.map((planet) => {
        const isSelected = planet.id === selectedId;
        return (
          <motion.button
            key={planet.id}
            onClick={() => onSelect(planet.id)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl min-w-[70px] cursor-pointer transition-colors"
            style={{
              backgroundColor: isSelected ? planet.color + "25" : "rgba(255,255,255,0.05)",
              borderWidth: 2,
              borderColor: isSelected ? planet.color : "transparent",
            }}
          >
            <span className="text-lg leading-none">{planet.emoji}</span>
            <span
              className="text-[11px] font-semibold leading-tight"
              style={{ color: isSelected ? planet.color : "rgba(255,255,255,0.7)" }}
            >
              {planet.name}
            </span>
            <span className="text-[10px] text-white/40 leading-tight">
              {planet.relativeGravity}g
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
