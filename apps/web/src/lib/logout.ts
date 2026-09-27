"use client";

import { signOut } from "next-auth/react";

/** Sign out and wipe everything cached for this user on the device (runtime caches + local state). */
export async function logout(locale: string) {
  await signOut({ redirect: false });
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.includes("precache")).map((k) => caches.delete(k)));
    }
    localStorage.removeItem("np-compare-v1");
    sessionStorage.clear();
  } catch {}
  window.location.href = `/${locale}`;
}
