import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  cleanerId: string | null;
  initialised: boolean;
  setSession: (s: Session | null) => void;
  setCleanerId: (id: string | null) => void;
  setInitialised: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  cleanerId: null,
  initialised: false,
  setSession: (session) => set({ session }),
  setCleanerId: (cleanerId) => set({ cleanerId }),
  setInitialised: (initialised) => set({ initialised }),
}));
