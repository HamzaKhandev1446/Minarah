"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UiIcon } from "./ui-icon";
export function AppNavigation() {
  const path = usePathname();
  if (path === "/") return null;
  return (
    <nav aria-label="Main navigation" className="main-nav app-navigation">
      {path.startsWith("/register-mosque") ? (
        <Link href="/" className="nav-back">
          Back to map <UiIcon name="arrow" size={16} />
        </Link>
      ) : (
        <>
          {path !== "/" && (
            <>
              <Link href="/">Map & discover</Link>
              <Link href="/?view=following">Following</Link>
            </>
          )}
          <Link className="register-link" href="/register-mosque">
            <UiIcon name="plus" size={16} />
            Register your mosque
          </Link>
        </>
      )}
    </nav>
  );
}
