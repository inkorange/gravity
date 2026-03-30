"use client";

import dynamic from "next/dynamic";

const ComparisonView = dynamic(
  () => import("./ComparisonView").then((m) => ({ default: m.ComparisonView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-white/50 text-lg">Loading 3D scene...</p>
      </div>
    ),
  }
);

export function Scene() {
  return <ComparisonView />;
}
