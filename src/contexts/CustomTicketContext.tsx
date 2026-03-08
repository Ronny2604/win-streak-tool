import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { NormalizedFixture } from "@/lib/odds-api";

export interface TicketSelection {
  fixtureId: string;
  fixture: NormalizedFixture;
  betType: string;
  label: string;
  odd: number;
}

interface CustomTicketContextType {
  selections: TicketSelection[];
  addSelection: (sel: TicketSelection) => void;
  removeSelection: (fixtureId: string) => void;
  clearSelections: () => void;
  isSelected: (fixtureId: string) => boolean;
  getSelection: (fixtureId: string) => TicketSelection | undefined;
  totalOdd: number;
}

const CustomTicketContext = createContext<CustomTicketContextType | undefined>(undefined);

export function CustomTicketProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<TicketSelection[]>([]);

  const addSelection = useCallback((sel: TicketSelection) => {
    setSelections((prev) => {
      const filtered = prev.filter((s) => s.fixtureId !== sel.fixtureId);
      return [...filtered, sel];
    });
  }, []);

  const removeSelection = useCallback((fixtureId: string) => {
    setSelections((prev) => prev.filter((s) => s.fixtureId !== fixtureId));
  }, []);

  const clearSelections = useCallback(() => setSelections([]), []);

  const isSelected = useCallback(
    (fixtureId: string) => selections.some((s) => s.fixtureId === fixtureId),
    [selections]
  );

  const getSelection = useCallback(
    (fixtureId: string) => selections.find((s) => s.fixtureId === fixtureId),
    [selections]
  );

  const totalOdd = selections.reduce((acc, s) => acc * s.odd, 1);

  return (
    <CustomTicketContext.Provider
      value={{ selections, addSelection, removeSelection, clearSelections, isSelected, getSelection, totalOdd }}
    >
      {children}
    </CustomTicketContext.Provider>
  );
}

export function useCustomTicket() {
  const ctx = useContext(CustomTicketContext);
  if (!ctx) throw new Error("useCustomTicket must be within CustomTicketProvider");
  return ctx;
}
