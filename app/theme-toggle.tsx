"use client";

import { useEffect, useState } from "react";

function SunIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3.5" /><path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>;
}

function MoonIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.2 15.3A8.4 8.4 0 0 1 8.7 3.8 8.5 8.5 0 1 0 20.2 15.3Z" /></svg>;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function chooseTheme(nextTheme: "light" | "dark") {
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem("kprint-theme", nextTheme);
    setTheme(nextTheme);
  }

  return <div aria-label="Tema da aparência" className="theme-switcher" role="group">
    <button aria-pressed={theme === "light"} className={theme === "light" ? "theme-option active" : "theme-option"} onClick={() => chooseTheme("light")} type="button"><SunIcon /><span>Claro</span></button>
    <button aria-pressed={theme === "dark"} className={theme === "dark" ? "theme-option active" : "theme-option"} onClick={() => chooseTheme("dark")} type="button"><MoonIcon /><span>Escuro</span></button>
  </div>;
}
