import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Minarah home">
      <svg
        width="30"
        height="36"
        viewBox="0 0 30 36"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 32V13L15 4L26 13V32M15 4V32"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 32H21"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span>
        minarah<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
