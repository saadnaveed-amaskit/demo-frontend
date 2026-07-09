import { useEffect, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2, Pencil, Check, X, ShieldAlert, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { guardrailsApi } from "./guardrails-api"
import type { GuardrailEntity, GuardrailForm } from "./guardrail-types"

const OPS = [">=", "<=", ">", "<", "="] as const

const formSchema = z.object({
  brand: z.string().min(1),
  division: z.string().min(1),
  rule: z.string().min(1),
  op: z.enum(OPS),
  value: z.string().regex(/^\d+(\.\d+)?$/, "Must be a number"),
  unit: z.string(),
})

const editSchema = z.object({
  value: z.string().regex(/^\d+(\.\d+)?$/, "Must be a number"),
})

type EditForm = z.infer<typeof editSchema>

export function GuardrailsScreen() {
  const [guardrails, setGuardrails] = useState<GuardrailEntity[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showEnforcement, setShowEnforcement] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addForm = useForm<GuardrailForm>({
    resolver: zodResolver(formSchema),
    defaultValues: { brand: "", division: "", rule: "", op: ">=", value: "", unit: "%" },
  })

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { value: "" },
  })

  const load = useCallback(async () => {
    try {
      setGuardrails(await guardrailsApi.list())
    } catch {
      setError("Failed to load guardrails.")
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleToggleActive = async (id: number) => {
    try {
      await guardrailsApi.toggleActive(id)
      await load()
    } catch { setError("Failed to toggle active.") }
  }

  const handleToggleOverridable = async (id: number) => {
    try {
      await guardrailsApi.toggleOverridable(id)
      await load()
    } catch { setError("Failed to toggle overridable.") }
  }

  const handleDelete = async (id: number) => {
    try {
      await guardrailsApi.remove(id)
      await load()
    } catch { setError("Failed to delete guardrail.") }
  }

  const handleStartEdit = (g: GuardrailEntity) => {
    setEditingId(g.id)
    editForm.reset({ value: g.value })
  }

  const handleSaveEdit = async (id: number) => {
    const valid = await editForm.trigger()
    if (!valid) return
    const { value } = editForm.getValues()
    try {
      await guardrailsApi.update(id, { value })
      setEditingId(null)
      await load()
    } catch { setError("Failed to save guardrail.") }
  }

  const handleAdd = addForm.handleSubmit(async (data) => {
    try {
      await guardrailsApi.create(data)
      addForm.reset()
      setShowAdd(false)
      await load()
    } catch { setError("Failed to create guardrail.") }
  })

  const hardConstraints = guardrails.filter((g) => g.active && !g.isOverridable)

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Guardrails</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEnforcement((v) => !v)}
          >
            <ShieldAlert className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
            Enforcement preview
          </Button>
          <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
            <Plus className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
            Add guardrail
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" aria-label={error} className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Add guardrail form */}
      {showAdd && (
        <form
          onSubmit={(e) => { e.preventDefault(); void handleAdd(e) }}
          className="rounded-lg border p-4"
        >
          <h2 className="mb-3 font-semibold text-sm">New guardrail</h2>
          <div className="flex flex-wrap gap-2">
            <Input {...addForm.register("brand")} placeholder="Brand" className="w-36" />
            <Input {...addForm.register("division")} placeholder="Division" className="w-40" />
            <Input {...addForm.register("rule")} placeholder="Rule label" className="w-40" />
            <select {...addForm.register("op")} className="rounded-md border px-2 py-1 text-sm bg-background">
              {OPS.map((op) => <option key={op}>{op}</option>)}
            </select>
            <Input {...addForm.register("value")} placeholder="Value" className="w-24" />
            <Input {...addForm.register("unit")} placeholder="Unit" className="w-16" />
            <Button type="submit" size="sm">Save</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
          {Object.values(addForm.formState.errors).length > 0 && (
            <p className="mt-1 text-xs text-destructive">Please fix validation errors.</p>
          )}
        </form>
      )}

      {/* Enforcement preview */}
      {showEnforcement && (
        <section
          data-testid="enforcement-preview"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20"
        >
          <h2 className="mb-3 font-semibold text-sm">
            <ShieldAlert className="mr-1 inline h-4 w-4 text-amber-600" strokeWidth={1.5} />
            Hard constraints (Pricing Team view — read-only)
          </h2>
          {hardConstraints.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hard constraints active.</p>
          ) : (
            <ul className="space-y-1">
              {hardConstraints.map((g) => (
                <li
                  key={g.id}
                  data-testid="hard-constraint-row"
                  className="flex items-center gap-3 rounded-md bg-background px-3 py-2 text-sm"
                >
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" strokeWidth={1.5} />
                  <span className="font-medium">{g.brand} / {g.division}</span>
                  <span className="text-muted-foreground">{g.rule} {g.op} {g.value}{g.unit}</span>
                  <span className="ml-auto text-xs font-medium text-amber-700 dark:text-amber-400">Hard constraint</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Main table */}
      <div data-testid="guardrails-table" className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Brand</th>
              <th className="px-3 py-2 text-left font-medium">Division</th>
              <th className="px-3 py-2 text-left font-medium">Rule</th>
              <th className="px-3 py-2 text-left font-medium">Op</th>
              <th className="px-3 py-2 text-left font-medium">Value</th>
              <th className="px-3 py-2 text-left font-medium">Unit</th>
              <th className="px-3 py-2 text-left font-medium">Active</th>
              <th className="px-3 py-2 text-left font-medium">Overridable</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {guardrails.map((g) => {
              const isHard = g.active && !g.isOverridable
              return (
                <tr key={g.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2">{g.brand}</td>
                  <td className="px-3 py-2">{g.division}</td>
                  <td className="px-3 py-2">{g.rule}</td>
                  <td className="px-3 py-2 font-mono">{g.op}</td>
                  <td className="px-3 py-2" data-testid="guardrail-value-cell">
                    {editingId === g.id ? (
                      <Input
                        {...editForm.register("value")}
                        aria-label="Guardrail value"
                        className="h-7 w-24 text-sm"
                      />
                    ) : (
                      g.value
                    )}
                  </td>
                  <td className="px-3 py-2">{g.unit}</td>
                  <td className="px-3 py-2">
                    <Switch
                      checked={g.active}
                      onCheckedChange={() => void handleToggleActive(g.id)}
                      aria-label={`Toggle active for guardrail ${g.id}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Switch
                      checked={g.isOverridable}
                      onCheckedChange={() => void handleToggleOverridable(g.id)}
                      aria-label={`Toggle overridable for guardrail ${g.id}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {isHard ? (
                      <span
                        data-testid="hard-constraint-badge"
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                      >
                        <ShieldAlert className="h-3 w-3" strokeWidth={1.5} />
                        Hard
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                        <ShieldCheck className="h-3 w-3" strokeWidth={1.5} />
                        Advisory
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      {editingId === g.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Save guardrail ${g.id}`}
                            onClick={() => void handleSaveEdit(g.id)}
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Cancel edit guardrail ${g.id}`}
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Edit guardrail ${g.id}`}
                          onClick={() => handleStartEdit(g)}
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete guardrail ${g.id}`}
                        onClick={() => void handleDelete(g.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
