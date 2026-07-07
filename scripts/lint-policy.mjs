// Retail Nucleus pinned-stack policy gate.
// Fails the build if a forbidden (non-pinned) library appears in dependencies
// or source imports. See knowledge constitution: Retail Nucleus Library-Pinned Stack.
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = dirname(fileURLToPath(import.meta.url))
const srcDir = join(rootDir, "..", "src")

const FORBIDDEN = [
  "redux",
  "@reduxjs/toolkit",
  "jotai",
  "recoil",
  "recharts",
  "chart.js",
  "victory",
  "highcharts",
  "moment",
  "dayjs",
  "styled-components",
]

const errors = []

const pkg = JSON.parse(readFileSync(join(rootDir, "..", "package.json")))
const declared = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
for (const name of FORBIDDEN) {
  if (declared[name]) errors.push(`Forbidden dependency in package.json: ${name}`)
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue
    const full = join(dir, entry)
    const s = statSync(full)
    if (s.isDirectory()) walk(full)
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) {
      const text = readFileSync(full, "utf8")
      for (const name of FORBIDDEN) {
        const re = new RegExp(`from\\s+["']${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(/|["'])`)
        if (re.test(text)) errors.push(`Forbidden import "${name}" in ${full}`)
      }
    }
  }
}
walk(srcDir)

if (errors.length) {
  console.error("lint:policy FAILED:\n" + errors.map((e) => "  - " + e).join("\n"))
  process.exit(1)
}
console.log("lint:policy OK — pinned-stack compliance verified.")
