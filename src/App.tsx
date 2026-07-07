import { motion } from "framer-motion"

/**
 * SLICE-00 minimal application shell.
 * Establishes the app boots with the Retail Nucleus brand heading.
 * Screens, routing, and global filters arrive in SLICE-01.
 */
export function App() {
  return (
    <motion.main
      id="app-root"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="min-h-screen bg-zinc-50 text-zinc-900"
    >
      <header className="border-b border-zinc-200 px-6 py-4">
        <h1 className="text-xl font-semibold">Retail Nucleus</h1>
      </header>
    </motion.main>
  )
}
