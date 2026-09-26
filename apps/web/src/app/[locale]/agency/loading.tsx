/** Admin skeleton (navy). */
export default function Loading() {
  return (
    <div className="min-h-screen bg-navy-2 lg:pl-60" aria-busy="true" aria-live="polite">
      <div className="fixed inset-y-0 left-0 hidden w-60 border-r border-navy-line bg-navy lg:block" />
      <div className="h-16 border-b border-navy-line" />
      <div className="animate-pulse space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-np border border-navy-line bg-navy-card" />)}
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="h-64 rounded-np border border-navy-line bg-navy-card xl:col-span-2" />
          <div className="h-64 rounded-np border border-navy-line bg-navy-card" />
        </div>
      </div>
    </div>
  );
}
