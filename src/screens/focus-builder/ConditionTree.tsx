import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AttributeOption, ConditionNode } from "./focus-types"

const MAX_DEPTH = 3

interface Props {
  node: Extract<ConditionNode, { type: "group" }>
  attributes: AttributeOption[]
  onChange: (node: ConditionNode) => void
  depth?: number
  rootIndexOffset?: number
}

export function ConditionTree({
  node,
  attributes,
  onChange,
  depth = 1,
}: Props) {
  const setLogic = (logic: "AND" | "OR") => onChange({ ...node, logic })

  const updateChild = (i: number, child: ConditionNode) =>
    onChange({ ...node, rules: node.rules.map((r, idx) => (idx === i ? child : r)) })

  const removeChild = (i: number) =>
    onChange({ ...node, rules: node.rules.filter((_, idx) => idx !== i) })

  const addRule = () =>
    onChange({ ...node, rules: [...node.rules, { type: "rule", attr: "", val: "" }] })

  const addGroup = () =>
    onChange({
      ...node,
      rules: [...node.rules, { type: "group", logic: "AND", rules: [] }],
    })

  return (
    <div className="rounded-md border p-3">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Match</span>
        <Button
          type="button"
          size="sm"
          variant={node.logic === "AND" ? "default" : "outline"}
          onClick={() => setLogic("AND")}
        >
          AND
        </Button>
        <Button
          type="button"
          size="sm"
          variant={node.logic === "OR" ? "default" : "outline"}
          onClick={() => setLogic("OR")}
        >
          OR
        </Button>
      </div>

      <ul className="space-y-2">
        {node.rules.map((child, i) =>
          child.type === "rule" ? (
            <li key={i} data-testid={`rule-${i}`} className="flex items-center gap-2">
              <Select
                value={child.attr}
                onValueChange={(attr) => updateChild(i, { type: "rule", attr, val: "" })}
              >
                <SelectTrigger aria-label="Attribute" className="w-44">
                  <SelectValue placeholder="Attribute" />
                </SelectTrigger>
                <SelectContent>
                  {attributes.map((a) => (
                    <SelectItem key={a.attr} value={a.attr}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={child.val}
                onValueChange={(val) => updateChild(i, { ...child, val })}
                disabled={!child.attr}
              >
                <SelectTrigger aria-label="Value" className="w-44">
                  <SelectValue placeholder="Value" />
                </SelectTrigger>
                <SelectContent>
                  {(attributes.find((a) => a.attr === child.attr)?.values ?? []).map(
                    (v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Remove rule ${i + 1}`}
                onClick={() => removeChild(i)}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </li>
          ) : (
            <li key={i} className="ml-4">
              <ConditionTree
                node={child}
                attributes={attributes}
                depth={depth + 1}
                onChange={(n) => updateChild(i, n)}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Remove group ${i + 1}`}
                onClick={() => removeChild(i)}
              >
                Remove group
              </Button>
            </li>
          ),
        )}
      </ul>

      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={addRule}>
          Add rule
        </Button>
        {depth < MAX_DEPTH && (
          <Button type="button" size="sm" variant="outline" onClick={addGroup}>
            Add group
          </Button>
        )}
      </div>
    </div>
  )
}
