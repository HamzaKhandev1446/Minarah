"use client";
import Link from "next/link";
import { useRef } from "react";
import { Brand } from "./brand";
import { PwaInstall } from "./pwa";
import { NotificationSettings } from "./notification-settings";
import { UiIcon } from "./ui-icon";
import { MenuRow } from "./menu-row";

export function PublicMenu({
  location,
  onLocations,
}: {
  location: string;
  onLocations: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const locationName = location.replace(/^Near\s+/i, "");
  return (
    <>
      <div className="public-topbar">
        <Brand />
        <button
          className="header-location"
          onClick={onLocations}
          aria-haspopup="dialog"
        >
          <UiIcon name="pin" size={18} />
          <span>{locationName}</span>
          <svg
            className="header-location-chevron"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <button
          className="drawer-toggle"
          aria-label="Open menu"
          aria-haspopup="dialog"
          onClick={() => dialog.current?.showModal()}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      <dialog
        ref={dialog}
        className="public-drawer"
        aria-labelledby="menu-title"
      >
        <div className="drawer-content">
          <div className="drawer-heading">
            <div className="drawer-brand">
              <Brand />
              <div>
                <h2 id="menu-title">Minarah</h2>
                <p>Your mosque, within reach.</p>
              </div>
            </div>
            <button
              className="drawer-toggle"
              aria-label="Close menu"
              onClick={() => dialog.current?.close()}
            >
              <UiIcon name="close" size={22} />
            </button>
          </div>
          <p className="drawer-section-label">Your community</p>
          <nav className="drawer-group" aria-label="App menu">
            <Link href="/auth/login" onClick={() => dialog.current?.close()}>
              <MenuRow
                icon="user"
                title="Login / Register"
                description="Your account and mosque management"
              />
            </Link>
            <Link
              href="/register-mosque"
              onClick={() => dialog.current?.close()}
            >
              <MenuRow
                icon="mosque"
                title="Register your mosque"
                description="Help your community find its Jamaat"
              />
            </Link>
            <button
              onClick={() => {
                dialog.current?.close();
                onLocations();
              }}
            >
              <MenuRow
                icon="pin"
                title="Saved locations"
                description="Home, work and places you visit"
              />
            </button>
          </nav>
          <p className="drawer-section-label">Make it yours</p>
          <section
            className="drawer-group drawer-preferences"
            aria-label="App preferences"
          >
            <PwaInstall />
            <NotificationSettings />
          </section>
          <p className="drawer-footer">A little closer to your next Jamaat.</p>
        </div>
      </dialog>
    </>
  );
}
