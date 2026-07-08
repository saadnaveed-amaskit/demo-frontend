import { useEffect } from "react"
import { useQueryState, parseAsStringLiteral } from "nuqs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRNState, type RNBrand, type RNChannel } from "@/state"

const BRANDS = ["both", "tcp", "gymboree"] as const
const CHANNELS = ["all", "digital", "store", "canada"] as const

const BRAND_LABELS: Record<RNBrand, string> = {
  both: "Both",
  tcp: "TCP",
  gymboree: "Gymboree",
}
const CHANNEL_LABELS: Record<RNChannel, string> = {
  all: "All Channels",
  digital: "Digital",
  store: "Store",
  canada: "Canada",
}

/** Global brand/channel filters (REQ-SHELL-002). URL-synced via nuqs and
 * mirrored into the Zustand store for downstream screens. */
export function GlobalFilters() {
  const [brand, setBrand] = useQueryState(
    "brand",
    parseAsStringLiteral(BRANDS).withDefault("both"),
  )
  const [channel, setChannel] = useQueryState(
    "channel",
    parseAsStringLiteral(CHANNELS).withDefault("all"),
  )
  const syncBrand = useRNState((s) => s.setBrand)
  const syncChannel = useRNState((s) => s.setChannel)

  useEffect(() => {
    syncBrand(brand)
  }, [brand, syncBrand])
  useEffect(() => {
    syncChannel(channel)
  }, [channel, syncChannel])

  return (
    <div className="flex items-center gap-3">
      <Select value={brand} onValueChange={(v) => void setBrand(v as RNBrand)}>
        <SelectTrigger aria-label="Brand" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BRANDS.map((b) => (
            <SelectItem key={b} value={b}>
              {BRAND_LABELS[b]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={channel}
        onValueChange={(v) => void setChannel(v as RNChannel)}
      >
        <SelectTrigger aria-label="Channel" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CHANNELS.map((c) => (
            <SelectItem key={c} value={c}>
              {CHANNEL_LABELS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
