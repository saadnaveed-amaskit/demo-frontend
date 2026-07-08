import { create } from "zustand"
import type { ConditionNode } from "./focus-types"

export const EMPTY_FILTER: ConditionNode = {
  type: "group",
  logic: "AND",
  rules: [{ type: "rule", attr: "", val: "" }],
}

interface FocusBuilderState {
  isFormOpen: boolean
  editingId: string | null
  formName: string
  formFilter: ConditionNode
  openNew: () => void
  openEdit: (id: string, name: string, filter: ConditionNode) => void
  closeForm: () => void
  setName: (name: string) => void
  setFilter: (filter: ConditionNode) => void
}

export const useFocusBuilderStore = create<FocusBuilderState>((set) => ({
  isFormOpen: false,
  editingId: null,
  formName: "",
  formFilter: EMPTY_FILTER,
  openNew: () =>
    set({ isFormOpen: true, editingId: null, formName: "", formFilter: EMPTY_FILTER }),
  openEdit: (id, name, filter) =>
    set({ isFormOpen: true, editingId: id, formName: name, formFilter: filter }),
  closeForm: () => set({ isFormOpen: false, editingId: null }),
  setName: (formName) => set({ formName }),
  setFilter: (formFilter) => set({ formFilter }),
}))
