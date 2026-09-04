"use client";
import { createContext, useContext, useState, ReactNode } from "react";
const Ctx = createContext<{ label: string | null; setLabel: (v: string | null) => void }>({ label: null, setLabel: () => {} });
export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  return <Ctx.Provider value={{ label, setLabel }}>{children}</Ctx.Provider>;
}
export function useBreadcrumbLabel() {
  return useContext(Ctx);
}
