import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="detail-shell">
      <h1>Mosque not found</h1>
      <p>This mosque is not available in the public directory.</p>
      <Link className="button" href="/">
        Find a mosque
      </Link>
    </main>
  );
}
