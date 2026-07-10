import { createBrowserRouter, Navigate } from "react-router-dom"
import { AppShell } from "./AppShell"
import { ScreenPlaceholder } from "@/screens/ScreenPlaceholder"
import { FocusBuilder } from "@/screens/focus-builder/FocusBuilder"
import { ProductGrid } from "@/screens/product-grid/ProductGrid"
import { GuardrailsScreen } from "@/screens/guardrails/GuardrailsScreen"
import { PromotionsScreen } from "@/screens/promotions/PromotionsScreen"
import { DiscountModelingScreen } from "@/screens/discount-modeling/DiscountModelingScreen"
import { PriceScenariosScreen } from "@/screens/price-scenarios/PriceScenariosScreen"
import { ApprovalsScreen } from "@/screens/approvals/ApprovalsScreen"
import { AgentsScreen } from "@/screens/agents/AgentsScreen"
import { AutonomyScreen } from "@/screens/autonomy/AutonomyScreen"
import { NAV_SECTIONS, UNLISTED_SCREENS } from "./nav"

const IMPLEMENTED: Record<string, React.ReactElement> = {
  "/focus": <FocusBuilder />,
  "/product-grid": <ProductGrid />,
  "/guardrails": <GuardrailsScreen />,
  "/promos": <PromotionsScreen />,
  "/discount-modeling": <DiscountModelingScreen />,
  "/scenario": <PriceScenariosScreen />,
  "/approvals": <ApprovalsScreen />,
  "/agents": <AgentsScreen />,
  "/autonomy": <AutonomyScreen />,
}

const screens = [
  ...NAV_SECTIONS.flatMap((section) => section.items),
  ...UNLISTED_SCREENS,
]

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/focus" replace /> },
      ...screens.map((screen) => ({
        path: screen.path.slice(1),
        element: IMPLEMENTED[screen.path] ?? <ScreenPlaceholder title={screen.label} />,
      })),
    ],
  },
])
