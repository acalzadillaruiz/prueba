/** Public skeleton (ivory). */
export default function Loading() {
  return (
    <div className="np-public min-h-screen" aria-busy="true" aria-live="polite">
      <div className="h-16 border-b border-line bg-ivory" />
      <div className="mx-auto max-w-[1280px] animate-pulse px-4 py-8 md:px-6">
        <div className="h-8 w-64 rounded-lg bg-black/10" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-np border border-line bg-white">
              <div className="aspect-[4/3] bg-navy/80" />
              <div className="space-y-2 p-4">
                <div className="h-5 w-32 rounded bg-black/10" />
                <div className="h-4 w-48 rounded bg-black/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
