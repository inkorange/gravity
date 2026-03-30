"use client";

import { useRef, useSyncExternalStore, useCallback } from "react";

interface SimData {
  position: number;
  velocity: number;
  impactVelocity: number;
  landed: boolean;
}

const defaultData: SimData = {
  position: 20,
  velocity: 0,
  impactVelocity: 0,
  landed: false,
};

type Listener = () => void;

function createSimStore() {
  let left: SimData = { ...defaultData };
  let right: SimData = { ...defaultData };
  const listeners = new Set<Listener>();

  function subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function notify() {
    listeners.forEach((l) => l());
  }

  return {
    setLeft(data: SimData) {
      left = data;
      notify();
    },
    setRight(data: SimData) {
      right = data;
      notify();
    },
    getLeft() {
      return left;
    },
    getRight() {
      return right;
    },
    reset() {
      left = { ...defaultData };
      right = { ...defaultData };
      notify();
    },
    subscribe,
  };
}

// Singleton store
export const simStore = createSimStore();

export function useSimData(side: "left" | "right"): SimData {
  const getter = side === "left" ? simStore.getLeft : simStore.getRight;
  return useSyncExternalStore(simStore.subscribe, getter, getter);
}
