"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CelestialBody, DropPhase } from "@/types";

interface FunFactProps {
  planet: CelestialBody;
  phase: DropPhase;
}

export function FunFact({ planet, phase }: FunFactProps) {
  const fact = useMemo(() => {
    const facts = planet.funFacts;
    return facts[Math.floor(Math.random() * facts.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planet.id, phase === "landed"]);

  return (
    <AnimatePresence>
      {phase === "landed" && (
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.95 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 15,
            delay: 0.4,
          }}
          className="absolute bottom-[80px] md:bottom-12 left-2 right-2 md:left-3 md:right-3 z-10"
        >
          <div
            className="rounded-xl px-2 py-1.5 md:px-3 md:py-2 text-center text-xs md:text-sm font-semibold backdrop-blur-sm"
            style={{
              backgroundColor: planet.color + "20",
              color: planet.color,
              borderWidth: 1,
              borderColor: planet.color + "40",
            }}
          >
            💡 {fact}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
