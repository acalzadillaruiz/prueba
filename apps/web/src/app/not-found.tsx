import Link from "next/link";

/** Last-resort 404 for paths outside /es and /en (the root layout already renders <html>/<body>). */
export default function RootNotFound() {
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ivory px-6 text-center text-ink">
      <h1 className="font-display text-3xl font-semibold">404 · New Place</h1>
      <p className="text-ink/70">No encontramos esta página. · We couldn’t find this page.</p>
      <div className="flex gap-3">
        <Link href="/es" className="rounded-np bg-coral-cta px-5 py-2.5 font-display text-white">Inicio</Link>
        <Link href="/en" className="rounded-np border border-line bg-white px-5 py-2.5 font-display">Home</Link>
      </div>
    </main>
  );
}
