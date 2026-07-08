/** Sidebar navigation model, grouped by persona (spec §1 navigation map). */
export interface NavItem {
  label: string
  path: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Pricing Team",
    items: [
      { label: "Focus Builder", path: "/focus" },
      { label: "Promotions", path: "/promos" },
      { label: "Price Scenarios", path: "/scenario" },
      { label: "Discount Modeling", path: "/discount-modeling" },
      { label: "Like-Item Mapping", path: "/like-items" },
      { label: "Measurement", path: "/measurement" },
    ],
  },
  {
    title: "Pricing Strategist",
    items: [
      { label: "Agents", path: "/agents" },
      { label: "Guardrails", path: "/guardrails" },
      { label: "Approvals", path: "/approvals" },
      { label: "Autonomy", path: "/autonomy" },
    ],
  },
  {
    title: "Admin",
    items: [{ label: "Config", path: "/config" }],
  },
]

/** Product Grid is routed but not shown in the sidebar (spec §1: "unlisted, routed"). */
export const UNLISTED_SCREENS: NavItem[] = [
  { label: "Product Grid", path: "/product-grid" },
]
