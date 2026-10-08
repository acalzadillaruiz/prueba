"use client";

import { useEffect, useState } from "react";
import { DEMO_ENABLED } from "@/lib/demo";

/** Screenshots (`?shot`) leave the demo controls out. */
export function useDemoVisible() {
  const [shot, setShot] = useState(false);
  useEffect(() => setShot(new URLSearchParams(window.location.search).has("shot")), []);
  return DEMO_ENABLED && !shot;
}
