"use client";

import { DropProvider } from "@/contexts/DropContext";
import { Scene } from "@/components/Scene";
import { DropButton } from "@/components/DropButton";
import { ObjectPicker } from "@/components/ObjectPicker";

export default function Home() {
  return (
    <DropProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-center py-1 md:py-2 border-b border-white/10">
          <h1 className="text-base md:text-xl font-bold tracking-tight">
            Gravity Playground
          </h1>
        </header>

        {/* 3D Scene + Planet Selectors */}
        <Scene />

        {/* Object Picker + Drop Button */}
        <footer className="flex flex-col items-center gap-1.5 py-2 md:gap-2 md:py-3 border-t border-white/10">
          <ObjectPicker />
          <DropButton />
        </footer>
      </div>
    </DropProvider>
  );
}
