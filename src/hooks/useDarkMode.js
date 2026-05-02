import { useState, useEffect } from "react";

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    // Lire la préférence sauvegardée
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) return saved === "true";
    // Sinon utiliser la préférence système
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("darkMode", isDark);
  }, [isDark]);

  const toggle = () => setIsDark((prev) => !prev);

  return { isDark, toggle };
}
