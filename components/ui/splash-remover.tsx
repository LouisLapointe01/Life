"use client";

import { useEffect } from "react";

export function SplashRemover() {
  useEffect(() => {
    const el = document.getElementById("__life_splash");
    if (!el) return;
    el.style.opacity = "0";
    const t = setTimeout(() => el.remove(), 450);
    return () => clearTimeout(t);
  }, []);
  return null;
}
