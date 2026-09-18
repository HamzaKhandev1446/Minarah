import Link from "next/link";

/** Shared Minarah mark: a simple mosque minaret and crescent. */
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Minarah home">
      <svg
        width="25"
        height="50"
        viewBox="22.6 1.6 34.8 69.8"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        role="img"
        aria-label="Minarah minaret logo"
      >
        <g
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M29 70V36h22v34M25 36h30M28 30h24l-4-6H32l-4 6ZM33 24V15l7-8 7 8v9M40 7V3M24 70h32" />
          <path d="M36 70V51a4 4 0 0 1 8 0v19" />
        </g>
        <path d="M39 2a5 5 0 1 0 7 7 5.4 5.4 0 0 1-7-7Z" fill="#9A8052" />
      </svg>
    </Link>
  );
}
