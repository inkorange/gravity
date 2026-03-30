"use client";

import { motion } from "framer-motion";
import { objects } from "@/lib/objects";
import { useDropContext } from "@/contexts/DropContext";

export function ObjectPicker() {
  const { objectId, setObject, phase } = useDropContext();
  const disabled = phase === "dropping";

  return (
    <div className="flex gap-2 justify-center px-3 py-2">
      {objects.map((obj) => {
        const isSelected = obj.id === objectId;
        return (
          <motion.button
            key={obj.id}
            onClick={() => !disabled && setObject(obj.id)}
            whileHover={disabled ? {} : { scale: 1.1, rotate: [-2, 2, 0] }}
            whileTap={disabled ? {} : { scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl min-w-[60px] cursor-pointer transition-colors"
            style={{
              backgroundColor: isSelected ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
              borderWidth: 2,
              borderColor: isSelected ? "rgba(255,255,255,0.5)" : "transparent",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <span className="text-lg leading-none">{obj.emoji}</span>
            <span className="text-[10px] font-semibold text-white/70 leading-tight">
              {obj.name}
            </span>
            <span className="text-[9px] text-white/35 leading-tight">
              {obj.mass >= 1000 ? `${(obj.mass / 1000).toFixed(0)}t` : `${obj.mass}kg`}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
