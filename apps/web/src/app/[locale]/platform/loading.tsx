/** Cockpit skeleton (brand v4): navy sidebar, Cal canvas, warm sand placeholders. */
const bone = "rounded-[4px] bg-gradient-to-r from-[#E3DACB] via-[#EFE9DF] to-[#E3DACB] dark:from-white/[.05] dark:via-white/[.08] dark:to-white/[.05]";

export default function Loading() {
  return (
    <div className="min-h-screen bg-ivory lg:pl-[264px] dark:bg-[#141617]" aria-busy="true" aria-live="polite">
      <div className="fixed inset-y-0 left-0 hidden w-[264px] bg-navy lg:block" />
      <div className="h-[104px] bg-navy lg:hidden" />
      <div className="mx-auto max-w-[1360px] animate-pulse space-y-6 px-4 pb-16 pt-6 md:px-10 md:pt-10">
        <div className="space-y-3">
          <div className={`h-3 w-40 ${bone}`} />
          <div className={`h-10 w-72 max-w-full ${bone}`} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className={`h-[132px] ${bone}`} />)}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <div className={`h-72 ${bone}`} />
          <div className={`h-72 ${bone}`} />
        </div>
      </div>
    </div>
  );
}
