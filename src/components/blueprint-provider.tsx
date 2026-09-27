"use client";

import { createContext, useContext } from "react";
import type { Blueprint } from "@/lib/blueprint/schema";

const BlueprintContext = createContext<Blueprint | null>(null);

export function BlueprintProvider({
  blueprint,
  children,
}: {
  blueprint: Blueprint;
  children: React.ReactNode;
}) {
  return <BlueprintContext.Provider value={blueprint}>{children}</BlueprintContext.Provider>;
}

export function useBlueprint() {
  const blueprint = useContext(BlueprintContext);
  if (!blueprint) {
    throw new Error("BlueprintProvider is missing");
  }
  return blueprint;
}
