import { useEffect, useState, useCallback } from "react"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, X, ChevronLeft, ChevronRight, Calendar, List } from "lucide-react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isSameDay, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  listPromotions,
  createPromotion,
  deletePromotion,
  getPromoProducts,
} from "./promotions-api"
import type {
  PromotionEntity,
  CreatePromotionDto,
  PromoProductRow,
  PromoStatusFilter,
} from "./promotion-types"

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const promoSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    discountType: z.enum(["percentage", "flat"]),
    discountValue: z.coerce.number().min(0, "Must be ≥ 0"),
    focusSetId: z.string(),
    channel: z.string().min(1, "Channel is required"),
    color: z.string().min(1, "Color is required"),
    notes: z.string(),
  })
  .refine((d) => d.endDate > d.startDate, {
    path: ["endDate"],
    message: "End date must be after start date",
  })

type PromoFormValues = z.infer<typeof promoSchema>

const STATUS_COLORS: Record<string, string> = {
  active: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  expired: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
}

const CHANNEL_COLORS: Record<string, string> = {
  active: "#0d9488",
  scheduled: "#7c3aed",
  expired: "#6b7280",
}

// ---------------------------------------------------------------------------
// PromoForm
// ---------------------------------------------------------------------------

interface PromoFormProps {
  onSave: (dto: CreatePromotionDto) => Promise<void>
  onCancel: () => void
  saving: boolean
}

function PromoForm({ onSave, onCancel, saving }: PromoFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PromoFormValues>({
    resolver: zodResolver(promoSchema),
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
      discountType: "percentage",
      discountValue: 10,
      focusSetId: "",
      channel: "US",
      color: "#0d9488",
      notes: "",
    },
  })

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        await onSave({
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
          discountType: data.discountType,
          discountValue: data.discountValue,
          focusSetId: data.focusSetId,
          channel: data.channel,
          color: data.color,
          notes: data.notes,
        })
      })}
      className="p-4 border rounded-lg bg-background flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="promo-name" className="text-sm font-medium">
          Promotion name
        </label>
        <Input id="promo-name" aria-label="Promotion name" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="promo-start" className="text-sm font-medium">
            Start date
          </label>
          <Input
            id="promo-start"
            type="date"
            aria-label="Start date"
            {...register("startDate")}
          />
          {errors.startDate && (
            <p className="text-xs text-destructive">{errors.startDate.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="promo-end" className="text-sm font-medium">
            End date
          </label>
          <Input
            id="promo-end"
            type="date"
            aria-label="End date"
            {...register("endDate")}
          />
          {errors.endDate && (
            <p className="text-xs text-destructive">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Discount type</label>
          <Controller
            control={control}
            name="discountType"
            render={({ field }) => (
              <select
                {...field}
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="percentage">Percentage</option>
                <option value="flat">Flat</option>
              </select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="promo-value" className="text-sm font-medium">
            Discount value
          </label>
          <Input
            id="promo-value"
            type="number"
            step="0.01"
            aria-label="Discount value"
            {...register("discountValue")}
          />
          {errors.discountValue && (
            <p className="text-xs text-destructive">{errors.discountValue.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="promo-channel" className="text-sm font-medium">
            Channel
          </label>
          <Input
            id="promo-channel"
            aria-label="Channel"
            defaultValue="US"
            {...register("channel")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="promo-color" className="text-sm font-medium">
            Color
          </label>
          <Input id="promo-color" type="color" aria-label="Color" {...register("color")} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="promo-notes" className="text-sm font-medium">
          Notes
        </label>
        <Input id="promo-notes" aria-label="Notes" {...register("notes")} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save promotion"}
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// PromoDetail drawer
// ---------------------------------------------------------------------------

interface PromoDetailProps {
  promo: PromotionEntity
  onClose: () => void
  onDelete: (id: number) => Promise<void>
}

function PromoDetail({ promo, onClose, onDelete }: PromoDetailProps) {
  const [products, setProducts] = useState<PromoProductRow[] | null>(null)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productError, setProductError] = useState<string | null>(null)

  const handleViewProducts = async () => {
    setLoadingProducts(true)
    setProductError(null)
    try {
      const view = await getPromoProducts(promo.id)
      setProducts(view.skus)
    } catch {
      setProductError("Failed to load products.")
    } finally {
      setLoadingProducts(false)
    }
  }

  return (
    <div
      data-testid="promo-drawer"
      className="fixed inset-y-0 right-0 w-96 bg-background border-l shadow-xl z-50 flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold truncate">{promo.name}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close drawer">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span
              data-testid="promo-status-badge"
              className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[promo.status] ?? ""}`}
            >
              {promo.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dates</span>
            <span>
              {promo.startDate} → {promo.endDate}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span>
              {promo.discountValue}
              {promo.discountType === "percentage" ? "%" : " flat"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Channel</span>
            <span>{promo.channel}</span>
          </div>
          {promo.notes && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Notes</span>
              <span className="text-right">{promo.notes}</span>
            </div>
          )}
        </div>

        <Button onClick={handleViewProducts} disabled={loadingProducts} variant="outline">
          {loadingProducts ? "Loading…" : "View Products"}
        </Button>

        {productError && <p className="text-xs text-destructive">{productError}</p>}

        {products !== null && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{products.length} SKU(s)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-1 pr-2">SKU</th>
                    <th className="text-left py-1 pr-2">Name</th>
                    <th className="text-right py-1 pr-2">Price</th>
                    <th className="text-right py-1">Promo</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((row) => (
                    <tr key={row.sku} data-testid="promo-product-row" className="border-b last:border-0">
                      <td className="py-1 pr-2 font-mono text-xs">{row.sku}</td>
                      <td className="py-1 pr-2 truncate max-w-[100px]">{row.name}</td>
                      <td className="py-1 pr-2 text-right">${row.price.toFixed(2)}</td>
                      <td className="py-1 text-right" data-testid="promo-price">
                        ${row.promoPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t">
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive"
          onClick={async () => {
            await onDelete(promo.id)
            onClose()
          }}
        >
          Delete promotion
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mini calendar view
// ---------------------------------------------------------------------------

interface PromoCalendarProps {
  promotions: PromotionEntity[]
  currentMonth: Date
  onSelectPromo: (promo: PromotionEntity) => void
}

function PromoCalendar({ promotions, currentMonth, onSelectPromo }: PromoCalendarProps) {
  const start = startOfMonth(currentMonth)
  const end = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start, end })
  const startDow = getDay(start)

  const getPromosForDay = (day: Date) =>
    promotions.filter((p) => {
      const s = parseISO(p.startDate)
      const e = parseISO(p.endDate)
      return day >= s && day <= e
    })

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 bg-muted">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: startDow }, (_, i) => (
          <div key={`empty-${i}`} className="border-t border-r h-20 bg-muted/20" />
        ))}
        {days.map((day) => {
          const dayPromos = getPromosForDay(day)
          const isToday = isSameDay(day, new Date())
          return (
            <div
              key={day.toISOString()}
              className={`border-t border-r h-20 p-1 text-sm overflow-hidden ${
                !isSameMonth(day, currentMonth) ? "bg-muted/20" : ""
              }`}
            >
              <span
                className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                {format(day, "d")}
              </span>
              <div className="flex flex-col gap-0.5 mt-0.5">
                {dayPromos.slice(0, 2).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onSelectPromo(p)}
                    className="text-left text-xs truncate px-1 rounded text-white w-full"
                    style={{ backgroundColor: p.color || CHANNEL_COLORS[p.status] }}
                  >
                    {p.name}
                  </button>
                ))}
                {dayPromos.length > 2 && (
                  <span className="text-xs text-muted-foreground">+{dayPromos.length - 2}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

type ViewMode = "list" | "calendar"

export function PromotionsScreen() {
  const [promotions, setPromotions] = useState<PromotionEntity[]>([])
  const [filter, setFilter] = useState<PromoStatusFilter>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<PromotionEntity | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setPromotions(await listPromotions())
    } catch {
      setError("Failed to load promotions.")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const counts = {
    all: promotions.length,
    active: promotions.filter((p) => p.status === "active").length,
    scheduled: promotions.filter((p) => p.status === "scheduled").length,
    expired: promotions.filter((p) => p.status === "expired").length,
  }

  const visible =
    filter === "all" ? promotions : promotions.filter((p) => p.status === filter)

  const handleSave = async (dto: CreatePromotionDto) => {
    setSaving(true)
    try {
      await createPromotion(dto)
      await load()
      setShowForm(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save promotion.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    await deletePromotion(id)
    await load()
  }

  const TAB_FILTERS: { key: PromoStatusFilter; label: string }[] = [
    { key: "all", label: `All (${counts.all})` },
    { key: "active", label: `Active (${counts.active})` },
    { key: "scheduled", label: `Scheduled (${counts.scheduled})` },
    { key: "expired", label: `Expired (${counts.expired})` },
  ]

  return (
    <div className="flex flex-col gap-4 p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Promotions</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            aria-label="Calendar view"
          >
            <Calendar className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Promotion
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* New Promotion form */}
      {showForm && (
        <PromoForm
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      )}

      {/* Status tabs */}
      <div className="flex gap-1 border-b pb-0">
        {TAB_FILTERS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors ${
              filter === tab.key
                ? "bg-background border border-b-background -mb-px text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Calendar month navigation */}
      {viewMode === "calendar" && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-28 text-center">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main content */}
      {viewMode === "calendar" ? (
        <PromoCalendar
          promotions={visible}
          currentMonth={currentMonth}
          onSelectPromo={setSelected}
        />
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto flex-1">
          {visible.length === 0 && (
            <p className="text-sm text-muted-foreground">No promotions found.</p>
          )}
          {visible.map((p) => (
            <button
              key={p.id}
              data-testid="promo-item"
              onClick={() => setSelected(p)}
              className="flex items-center gap-3 p-3 border rounded-lg text-left hover:bg-accent transition-colors"
            >
              <div
                className="w-3 h-10 rounded-sm shrink-0"
                style={{ backgroundColor: p.color || CHANNEL_COLORS[p.status] }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.startDate} → {p.endDate} · {p.discountValue}
                  {p.discountType === "percentage" ? "%" : " off"}
                </p>
              </div>
              <span
                data-testid="promo-status-badge"
                className={`px-2 py-0.5 rounded text-xs font-medium capitalize shrink-0 ${STATUS_COLORS[p.status] ?? ""}`}
              >
                {p.status}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setSelected(null)}
          />
          <PromoDetail
            promo={selected}
            onClose={() => setSelected(null)}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  )
}
