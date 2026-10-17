"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SCROLL_KEY } from "./language-switcher";

/** Restores the reading position after a language switch (same page, other locale). */
export function ScrollRestore() {
  const pathname = usePathname();

  useEffect(() => {
    let saved: { path: string; ratio: number } | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? "null");
      sessionStorage.removeItem(SCROLL_KEY);
    } catch {
      return;
    }
    if (!saved || saved.path !== pathname.split("/").slice(2).join("/")) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: saved.ratio * max, behavior: "instant" });
  }, [pathname]);

  return null;
}
