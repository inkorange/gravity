"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useDropContext } from "@/contexts/DropContext";

export function DropButton() {
  const { phase, drop, reset } = useDropContext();

  return (
    <AnimatePresence mode="wait">
      {phase === "landed" ? (
        <motion.button
          key="reset"
          onClick={reset}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="px-8 py-3 text-xl font-bold rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
        >
          Try Again!
        </motion.button>
      ) : (
        <motion.button
          key="drop"
          onClick={drop}
          disabled={phase === "dropping" || phase === "anticipation"}
          initial={{ scale: 1 }}
          animate={
            phase === "idle"
              ? { scale: [1, 1.04, 1], transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" } }
              : { scale: 1 }
          }
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.88, y: 4 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
          className="px-8 py-3 text-xl font-bold rounded-full bg-gradient-to-b from-red-500 to-red-700 text-white shadow-lg shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {phase === "dropping" || phase === "anticipation" ? "Dropping..." : "DROP IT!"}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
