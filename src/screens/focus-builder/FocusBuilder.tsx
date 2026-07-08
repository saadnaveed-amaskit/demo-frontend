import { useEffect, useRef, useCallback } from "react"
import { Download, Plus, ExternalLink } from "lucide-react"
import { useQueryState } from "nuqs"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConditionTree } from "./ConditionTree"
import { focusApi } from "./focus-api"
import { skusToCsv, downloadCsv } from "./csv"
import { useFocusBuilderStore } from "./state"
import type { AttributeOption, ConditionNode, FocusSetView, SkuView } from "./focus-types"
import { useState } from "react"

function hasCompleteRule(node: ConditionNode): boolean {
  if (node.type === "rule") return node.attr !== "" && node.val !== ""
  return node.rules.some(hasCompleteRule)
}

export function FocusBuilder() {
  const navigate = useNavigate()
  const [focusSets, setFocusSets] = useState<FocusSetView[]>([])
  const [attributes, setAttributes] = useState<AttributeOption[]>([])
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewSkus, setPreviewSkus] = useState<SkuView[]>([])
  const [search, setSearch] = useQueryState("q", { defaultValue: "" })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    isFormOpen,
    editingId,
    formName,
    formFilter,
    openNew,
    openEdit,
    closeForm,
    setName,
    setFilter,
  } = useFocusBuilderStore()

  const refreshList = useCallback(() => {
    focusApi.list().then(setFocusSets).catch(console.error)
  }, [])

  useEffect(() => {
    refreshList()
    focusApi.attributes().then(setAttributes).catch(console.error)
  }, [refreshList])

  useEffect(() => {
    if (!isFormOpen) return
    if (!hasCompleteRule(formFilter)) {
      setPreviewCount(null)
      setPreviewSkus([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      focusApi
        .resolve(formFilter)
        .then(({ count, skus }) => {
          setPreviewCount(count)
          setPreviewSkus(skus.slice(0, 8))
        })
        .catch(() => {
          setPreviewCount(0)
          setPreviewSkus([])
        })
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [formFilter, isFormOpen])

  const handleOpenNew = () => {
    setPreviewCount(null)
    setPreviewSkus([])
    openNew()
  }

  const handleOpenEdit = (set: FocusSetView) => {
    setPreviewCount(set.productCount)
    setPreviewSkus([])
    openEdit(set.id, set.name, set.filter)
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    try {
      if (editingId) {
        await focusApi.update(editingId, formName.trim(), formFilter)
      } else {
        await focusApi.create(formName.trim(), formFilter)
      }
      refreshList()
      closeForm()
    } catch (err) {
      console.error(err)
    }
  }

  const handleExport = async (set: FocusSetView) => {
    try {
      const { skus } = await focusApi.resolveById(set.id)
      downloadCsv(`${set.name}.csv`, skusToCsv(skus))
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await focusApi.remove(id)
      refreshList()
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = focusSets.filter((s) =>
    s.name.toLowerCase().includes((search ?? "").toLowerCase()),
  )

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Focus Builder</h1>
        <Button onClick={handleOpenNew}>
          <Plus className="mr-1 h-4 w-4" strokeWidth={1.5} />
          New Focus Set
        </Button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Library panel */}
        <section className="flex flex-1 flex-col gap-3 overflow-y-auto">
          <Input
            aria-label="Search focus sets"
            placeholder="Search focus sets…"
            value={search ?? ""}
            onChange={(e) => void setSearch(e.target.value || null)}
          />

          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No focus sets found.</p>
          )}

          <ul className="space-y-3">
            {filtered.map((set) => (
              <li key={set.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium">{set.name}</h3>
                    <p className="text-sm text-muted-foreground">{set.productCount} SKUs</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Open ${set.name} in grid`}
                      onClick={() => navigate(`/product-grid?focus=${set.id}`)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Export ${set.name}`}
                      onClick={() => void handleExport(set)}
                    >
                      <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleOpenEdit(set)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleDelete(set.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Form + preview panel */}
        {isFormOpen && (
          <section className="flex w-[480px] shrink-0 flex-col gap-4 overflow-y-auto rounded-lg border p-4">
            <h2 className="font-semibold">{editingId ? "Edit Focus Set" : "New Focus Set"}</h2>

            <div className="flex flex-col gap-1">
              <label htmlFor="focus-name" className="text-sm font-medium">
                Focus set name
              </label>
              <Input
                id="focus-name"
                value={formName}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Girls Q2"
              />
            </div>

            <ConditionTree
              node={formFilter as Extract<ConditionNode, { type: "group" }>}
              attributes={attributes}
              onChange={setFilter}
            />

            {/* Live preview */}
            {previewCount !== null && (
              <div className="rounded-md border p-3">
                {previewCount > 0 ? (
                  <>
                    <p
                      className="mb-2 text-sm font-medium"
                      data-testid="preview-count"
                    >
                      {previewCount} SKUs matched
                    </p>
                    <ul className="space-y-1">
                      {previewSkus.map((sku) => (
                        <li
                          key={sku.sku}
                          data-testid="preview-sku"
                          className="truncate text-xs text-muted-foreground"
                        >
                          {sku.sku} — {sku.name}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div
                    role="alert"
                    aria-label="No matches found"
                    className="text-sm text-destructive"
                  >
                    No matches found for this filter
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => void handleSave()} disabled={!formName.trim()}>
                Save
              </Button>
              <Button variant="outline" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
