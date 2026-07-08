import { RouterProvider } from "react-router-dom"
import { router } from "@/app/routes"

/** Retail Nucleus application root. Mounts the router (which renders the
 * app shell, navigation, global filters, and routed screens). */
export function App() {
  return <RouterProvider router={router} />
}
