"use client";
import { useEffect, useRef, useState } from "react";
import {
  SAVED_ADDRESSES_KEY,
  parseSavedAddresses,
  savedAddressSchema,
  type SavedAddress,
} from "@/lib/saved-addresses";
import { MosqueMap } from "./mosque-map";
import { UiIcon } from "./ui-icon";
import { SavedPlaceSearch } from "./saved-place-search";

type Point = { latitude: number; longitude: number };
export function SavedAddresses({
  position,
  onSelect,
  onClose,
  onLocate,
}: {
  position: Point | null;
  onSelect: (address: Point & { label: string }) => void;
  onClose: () => void;
  onLocate: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<SavedAddress[]>([]);
  const [message, setMessage] = useState("");
  const [point, setPoint] = useState(position);
  const [naming, setNaming] = useState(false);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const selectedId = items.find(
    (item) =>
      position &&
      item.latitude === position.latitude &&
      item.longitude === position.longitude,
  )?.id;
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const read = () => {
      try {
        setItems(
          parseSavedAddresses(localStorage.getItem(SAVED_ADDRESSES_KEY)),
        );
      } catch {
        setMessage("Browser storage is unavailable.");
      }
    };
    const timer = setTimeout(read, 0);
    window.addEventListener("storage", read);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", read);
      element?.close();
    };
  }, []);
  function save(next: SavedAddress[]) {
    localStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(next));
    setItems(next);
  }
  return (
    <dialog
      ref={dialog}
      className="saved-addresses"
      aria-labelledby="places-title"
      onClose={onClose}
    >
      <div className="places-heading">
        <h2 id="places-title">Choose a location</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close location selector"
        >
          Close
        </button>
      </div>
      <p>
        Use your location to find nearby mosques, or tap a point on the map.
      </p>
      <button type="button" onClick={onLocate}>
        Use my location
      </button>
      {items.length > 0 && (
        <ul className="saved-place-list" aria-label="Saved places">
          {items.map((item) => (
            <li
              className={`saved-place-card${selectedId === item.id ? " is-selected" : ""}`}
              key={item.id}
            >
              <button
                className="saved-place-select"
                type="button"
                aria-pressed={selectedId === item.id}
                onClick={() => onSelect(item)}
              >
                <span className="saved-place-icon" aria-hidden="true">
                  <UiIcon name="pin" size={20} />
                </span>
                <span>
                  <strong>{item.label}</strong>
                  <small>
                    {item.kind === "other"
                      ? "Saved location"
                      : `${item.kind[0]?.toUpperCase()}${item.kind.slice(1)} location`}
                  </small>
                </span>
              </button>
              <div className="saved-place-card-actions">
                <button
                  className="saved-place-action"
                  type="button"
                  aria-label={`Edit saved place ${item.label}`}
                  title="Edit saved place"
                  onClick={() => {
                    setEditing(item);
                    setPoint({
                      latitude: item.latitude,
                      longitude: item.longitude,
                    });
                    setNaming(true);
                    setMessage(
                      `Editing ${item.label}. Move the map pin if needed.`,
                    );
                  }}
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                  </svg>
                </button>
                <button
                  className="saved-place-action is-delete"
                  type="button"
                  aria-label={`Delete saved place ${item.label}`}
                  title="Delete saved place"
                  onClick={() => {
                    try {
                      save(
                        parseSavedAddresses(
                          localStorage.getItem(SAVED_ADDRESSES_KEY),
                        ).filter((value) => value.id !== item.id),
                      );
                      if (editing?.id === item.id) {
                        setEditing(null);
                        setNaming(false);
                      }
                      setMessage(`${item.label} deleted.`);
                    } catch {
                      setMessage("Could not delete this saved place.");
                    }
                  }}
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v6m4-6v6" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <SavedPlaceSearch
        onSelect={(place) => {
          setPoint({ latitude: place.latitude, longitude: place.longitude });
          setEditing(null);
          setNaming(true);
          setMessage("");
        }}
      />
      <div className="saved-place-map" aria-label="Pick a location to save">
        <MosqueMap
          pickingLabel="Choose a point on the map"
          center={point ?? undefined}
          onPick={(latitude, longitude) => {
            setPoint({ latitude, longitude });
            setMessage("");
          }}
        />
      </div>
      {point ? (
        <div className="place-actions">
          <button
            type="button"
            className="view-mosque"
            onClick={() => onSelect({ ...point, label: "selected location" })}
          >
            Use this location
          </button>
          {!naming && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setNaming(true);
              }}
            >
              Save this place
            </button>
          )}
        </div>
      ) : (
        <p>Tap the map to choose a place.</p>
      )}
      {naming && point && (
        <form
          key={editing?.id ?? "new-place"}
          onSubmit={(event) => {
            event.preventDefault();
            const label = String(
              new FormData(event.currentTarget).get("label") ?? "",
            ).trim();
            const parsed = savedAddressSchema.safeParse({
              id: editing?.id ?? crypto.randomUUID(),
              kind: editing?.kind ?? "other",
              label,
              address: editing?.address ?? "",
              ...point,
            });
            if (!parsed.success) {
              setMessage("Give this place a name.");
              return;
            }
            try {
              const current = parseSavedAddresses(
                localStorage.getItem(SAVED_ADDRESSES_KEY),
              );
              const duplicate = current.find(
                (item) =>
                  item.id !== editing?.id &&
                  item.label.toLocaleLowerCase() === label.toLocaleLowerCase(),
              );
              if (duplicate) {
                setMessage("A saved place already uses that name.");
                return;
              }
              const next = current.filter((item) => item.id !== editing?.id);
              if (next.length >= 20) {
                setMessage("You can save up to 20 places.");
                return;
              }
              const place = parsed.data;
              save([...next, place]);
              onSelect(place);
            } catch {
              setMessage("Browser storage could not save this place.");
            }
          }}
        >
          <strong>{editing ? "Edit saved place" : "Save this place"}</strong>
          <label htmlFor="saved-place-name">Place name</label>
          <input
            id="saved-place-name"
            name="label"
            required
            maxLength={60}
            placeholder="Home, Work, or any name"
            defaultValue={editing?.label ?? ""}
            autoFocus
          />
          <div className="place-actions">
            <button className="view-mosque" type="submit">
              {editing ? "Update place" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setNaming(false);
                setEditing(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <p className="places-note">Saved on this device. No account needed.</p>
      {message && <p role="status">{message}</p>}
    </dialog>
  );
}
