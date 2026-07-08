import { createBrowserRouter, Navigate } from "react-router-dom"
import { AppShell } from "./AppShell"
import { ScreenPlaceholder } from "@/screens/ScreenPlaceholder"
import { NAV_SECTIONS, UNLISTED_SCREENS } from "./nav"

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
        element: <ScreenPlaceholder title={screen.label} />,
      })),
    ],
  },
])
