"use client";

import { useDropContext } from "@/contexts/DropContext";

export function DropButton() {
  const { phase, drop, reset } = useDropContext();

  if (phase === "landed") {
    return (
      <button
        onClick={reset}
        className="px-8 py-3 text-xl font-bold rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
      >
        Try Again!
      </button>
    );
  }

  return (
    <button
      onClick={drop}
      disabled={phase === "dropping"}
      className="px-8 py-3 text-xl font-bold rounded-full bg-gradient-to-b from-red-500 to-red-700 text-white hover:from-red-400 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
    >
      {phase === "dropping" ? "Dropping..." : "DROP IT!"}
    </button>
  );
}
