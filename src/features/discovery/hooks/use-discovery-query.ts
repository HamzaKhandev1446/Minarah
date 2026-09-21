"use client";
import { useCallback, useRef, useState } from "react";
import type {
  DataMode,
  DiscoveryQuery,
  DiscoveryResponse,
} from "@/domain/discovery";
import { fetchDiscovery } from "@/lib/discovery-client";

/** Owns request sequencing; a slow earlier response cannot replace newer intent. */
export function useDiscoveryQuery(mode: DataMode) {
  const [data, setData] = useState<DiscoveryResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const query = useRef<DiscoveryQuery | null>(null);
  const invalidate = useCallback(() => {
    sequence.current++;
  }, []);
  const load = useCallback(
    async (next: DiscoveryQuery, refresh = false) => {
      const request = ++sequence.current;
      query.current = next;
      setBusy(true);
      setError("");
      if (!refresh) {
        setData(null);
        setSelectedId(null);
      }
      try {
        const response = await fetchDiscovery(next, mode);
        if (request === sequence.current) {
          setData(response);
          if (!refresh) setSelectedId(response.results[0]?.mosque.id ?? null);
        }
      } catch (failure) {
        if (request === sequence.current)
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to load published times.",
          );
      } finally {
        if (request === sequence.current) setBusy(false);
      }
    },
    [mode],
  );
  const clear = useCallback(() => {
    invalidate();
    query.current = null;
    setData(null);
    setError("");
    setBusy(false);
  }, [invalidate]);
  return {
    data,
    selectedId,
    setSelectedId,
    busy,
    error,
    query,
    load,
    invalidate,
    clear,
  };
}
