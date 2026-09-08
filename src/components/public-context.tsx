"use client";
import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
} from "react";
import {
  FOLLOW_EVENT,
  followsKey,
  parseFollows,
  toggleFollow,
} from "@/lib/follows/storage";
import type { DataMode } from "@/domain/discovery";
type Position = { latitude: number; longitude: number };
const LocationContext = createContext<{
  position: Position | null;
  setPosition: (value: Position) => void;
}>({ position: null, setPosition: () => {} });
export function PublicProvider({ children }: { children: React.ReactNode }) {
  const [position, setPosition] = useState<Position | null>(null);
  return (
    <LocationContext.Provider value={{ position, setPosition }}>
      {children}
    </LocationContext.Provider>
  );
}
export const usePosition = () => useContext(LocationContext);
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(FOLLOW_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(FOLLOW_EVENT, listener);
  };
}
export function useFollows(mode: DataMode) {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(followsKey(mode)) ?? "[]";
      } catch {
        return "unavailable";
      }
    },
    () => "[]",
  );
  return { ids: parseFollows(raw), available: raw !== "unavailable" };
}
export function FollowButton({ id, mode }: { id: string; mode: DataMode }) {
  const { ids } = useFollows(mode);
  const [message, setMessage] = useState("");
  const followed = ids.includes(id);
  function toggle() {
    try {
      const next = toggleFollow(localStorage, mode, id);
      window.dispatchEvent(new Event(FOLLOW_EVENT));
      setMessage(
        next.includes(id)
          ? "Followed on this browser."
          : "Removed from your followed mosques.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error && error.message.includes("50 mosques")
          ? error.message
          : "Your browser could not save this change. Check browser storage settings and try again.",
      );
    }
  }
  return (
    <div className="follow-control">
      <button
        className={followed ? "button secondary" : "button"}
        type="button"
        aria-pressed={followed}
        onClick={toggle}
      >
        {followed ? "Following · Unfollow" : "Follow Mosque"}
      </button>
      <span role="status" className="muted">
        {message}
      </span>
    </div>
  );
}
