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
  }, [planet.id, phase === "landed"]);

  return (
    <AnimatePresence>
      {phase === "landed" && (
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.3 }}
          className="absolute bottom-12 left-3 right-3 z-10"
        >
          <div
            className="rounded-xl px-3 py-2 text-center text-sm font-semibold"
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
