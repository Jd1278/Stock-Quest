import { useSimulation } from "./simulation";
import { create } from "zustand";
import { authService } from "../services";
import { hasToken, setToken } from "../services/http";
import type { User } from "../types";
export const useAuth = create<{
  user: User | null;
  loading: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clear: () => void;
  setUser: (user: User) => void;
}>((set) => ({
  user: null,
  loading: true,
  async init() {
    if (!hasToken()) {
      set({ loading: false });
      return;
    }
    try {
      set({ user: await authService.me(), loading: false });
    } catch {
      setToken(null);
      set({ user: null, loading: false });
    }
  },
  async login(email, password) {
    useSimulation.getState().reset();
    const session = await authService.login({ email, password });
    setToken(session.token);
    set({ user: session.user });
  },
  async logout() {
    try {
      await authService.logout();
    } finally {
      useSimulation.getState().reset();
      setToken(null);
      set({ user: null });
    }
  },
  clear() {
    useSimulation.getState().reset();
    setToken(null);
    set({ user: null, loading: false });
  },
  setUser(user) {
    set({ user });
  },
}));
