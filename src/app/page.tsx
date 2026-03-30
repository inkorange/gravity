"use client";

import { DropProvider } from "@/contexts/DropContext";
import { Scene } from "@/components/Scene";
import { DropButton } from "@/components/DropButton";

export default function Home() {
  return (
    <DropProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-center py-3 border-b border-white/10">
          <h1 className="text-2xl font-bold tracking-tight">
            Gravity Playground
          </h1>
        </header>

        {/* 3D Scene */}
        <Scene />

        {/* Controls */}
        <footer className="flex items-center justify-center py-4 border-t border-white/10">
          <DropButton />
        </footer>
      </div>
    </DropProvider>
  );
}
