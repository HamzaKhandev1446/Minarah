"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="detail-shell">
      <h1>Information unavailable</h1>
      <p role="alert">
        We could not load mosque information. Please try again. The live
        directory may not be connected yet.
      </p>
      <div className="actions">
        <button className="button" onClick={reset}>
          Try again
        </button>
        <Link className="button secondary" href="/">
          Find mosques
        </Link>
        <Link href="/?mode=demo">Explore the fictional demo</Link>
      </div>
    </main>
  );
}
