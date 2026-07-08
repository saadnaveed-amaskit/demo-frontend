import { NavLink, Outlet } from "react-router-dom"
import { motion } from "framer-motion"
import { NuqsAdapter } from "nuqs/adapters/react-router/v7"
import { cn } from "@/lib/utils"
import { NAV_SECTIONS } from "./nav"
import { GlobalFilters } from "./GlobalFilters"

/** Application shell: persona-grouped sidebar navigation + global filter header
 * + routed content outlet (REQ-SHELL-001, REQ-SHELL-002). */
export function AppShell() {
  return (
    <NuqsAdapter>
      <div className="flex min-h-screen">
        <aside className="w-64 shrink-0 border-r bg-secondary/30 p-4">
          <h1 className="mb-6 text-lg font-semibold">Retail Nucleus</h1>
          <nav className="space-y-6">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </h2>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          cn(
                            "block rounded-md px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                            isActive && "bg-accent font-medium",
                          )
                        }
                      >
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>
        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b px-6 py-3">
            <span className="text-sm text-muted-foreground">
              Pricing Intelligence
            </span>
            <GlobalFilters />
          </header>
          <motion.main
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex-1 p-6"
          >
            <Outlet />
          </motion.main>
        </div>
      </div>
    </NuqsAdapter>
  )
}
