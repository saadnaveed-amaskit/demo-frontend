import { create } from "zustand"

export type RNBrand = "both" | "tcp" | "gymboree"
export type RNChannel = "all" | "digital" | "store" | "canada"

interface RNState {
  brand: RNBrand
  channel: RNChannel
  setBrand: (brand: RNBrand) => void
  setChannel: (channel: RNChannel) => void
}

/** Global Retail Nucleus UI state. Brand/channel are mirrored from the
 * URL-synced filters (nuqs) so screens can read the active scope. */
export const useRNState = create<RNState>((set) => ({
  brand: "both",
  channel: "all",
  setBrand: (brand) => set({ brand }),
  setChannel: (channel) => set({ channel }),
}))
