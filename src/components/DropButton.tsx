"use client";

import { motion } from "framer-motion";
import { useDropContext } from "@/contexts/DropContext";

export function DropButton() {
  const { phase, drop, reset } = useDropContext();

  if (phase === "landed") {
    return (
      <motion.button
        onClick={reset}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        aria-label="Reset and try again"
        className="px-8 py-3 text-xl font-bold rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
      >
        Try Again!
      </motion.button>
    );
  }

  const isDropping = phase === "dropping" || phase === "anticipation";

  return (
    <motion.button
      onClick={drop}
      disabled={isDropping}
      animate={
        phase === "idle"
          ? { scale: [1, 1.04, 1] }
          : { scale: 1 }
      }
      transition={
        phase === "idle"
          ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
          : { type: "spring", stiffness: 500, damping: 15 }
      }
      whileHover={isDropping ? {} : { scale: 1.08 }}
      whileTap={isDropping ? {} : { scale: 0.88, y: 4 }}
      aria-label={isDropping ? "Object is dropping" : "Drop the object"}
      className="px-8 py-3 text-xl font-bold rounded-full bg-gradient-to-b from-red-500 to-red-700 text-white shadow-lg shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {isDropping ? "Dropping..." : "DROP IT!"}
    </motion.button>
  );
}
