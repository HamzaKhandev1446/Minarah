"use client";
export function PrintButton() {
  return (
    <button className="button no-print" onClick={() => window.print()}>
      Print QR poster
    </button>
  );
}
