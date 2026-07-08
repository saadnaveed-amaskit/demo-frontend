import { RouterProvider } from "react-router-dom"
import { NuqsAdapter } from "nuqs/adapters/react-router/v7"
import { router } from "@/app/routes"

/** Retail Nucleus application root. Mounts the router (which renders the
 * app shell, navigation, global filters, and routed screens). */
export function App() {
  return (
    <NuqsAdapter>
      <RouterProvider router={router} />
    </NuqsAdapter>
  )
}
