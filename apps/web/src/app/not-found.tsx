import Link from "next/link";

export default function RootNotFound() {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui", display: "grid", placeItems: "center", minHeight: "100vh", background: "#F7F4EF", color: "#111827" }}>
        <div style={{ textAlign: "center" }}>
          <h1>404 · New Place</h1>
          <Link href="/es" style={{ color: "#F26B4D" }}>Volver al inicio</Link>
        </div>
      </body>
    </html>
  );
}
