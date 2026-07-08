/** Placeholder screen for SLICE-01. Real screens arrive in their own slices;
 * this establishes routing + the page heading contract. */
export function ScreenPlaceholder({ title }: { title: string }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This screen is delivered in a later slice.
      </p>
    </section>
  )
}
