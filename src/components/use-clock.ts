"use client";
import { useEffect, useState } from "react";
export function useClock(initial: string) {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString());
    const timer = setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, []);
  return now;
}
