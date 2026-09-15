import { create } from "zustand";
import { simulationService } from "../services";
import type { Run } from "../types";
let generation = 0;
export const useSimulation = create<{
  run: Run | null;
  busy: boolean;
  error: string;
  start: (id: string) => Promise<void>;
  resume: (id: string) => Promise<void>;
  decide: (quantity: number) => Promise<void>;
  reset: () => void;
}>((set) => ({
  run: null,
  busy: false,
  error: "",
  async start(id) {
    const version = generation;
    set({ busy: true, error: "" });
    try {
      const run = await simulationService.start(id);
      if (version === generation) set({ run });
    } catch (e) {
      if (version === generation) set({ error: (e as Error).message });
    } finally {
      if (version === generation) set({ busy: false });
    }
  },
  async resume(id) {
    const version = generation;
    set({ busy: true, error: "" });
    try {
      const run = await simulationService.get(id);
      if (version === generation) set({ run });
    } catch (e) {
      if (version === generation) set({ error: (e as Error).message });
    } finally {
      if (version === generation) set({ busy: false });
    }
  },
  async decide(quantity) {
    const { run, busy } = useSimulation.getState();
    if (!run || busy) return;
    const version = generation;
    set({ busy: true, error: "" });
    try {
      const next = await simulationService.decide(run.id, run.day, quantity);
      if (version === generation) set({ run: next });
    } catch (e) {
      if (version !== generation) return;
      set({ error: (e as Error).message });
      try {
        const latest = await simulationService.get(run.id);
        if (version === generation) set({ run: latest });
      } catch {
        /* Keep the decision error visible. */
      }
    } finally {
      if (version === generation) set({ busy: false });
    }
  },
  reset() {
    generation++;
    set({ run: null, busy: false, error: "" });
  },
}));
