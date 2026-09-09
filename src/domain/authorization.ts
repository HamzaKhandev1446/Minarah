import type { MemberRole } from "./types";

export type MosqueOperation = "edit_schedule" | "publish_schedule" | "view_qr";
export interface Membership {
  userId: string;
  mosqueId: string;
  role: MemberRole;
  status: "active" | "suspended";
}

/** UI/server helper only; database RLS and privileged functions enforce the same rule. */
export function canManageMosque(
  userId: string | null,
  mosqueId: string,
  membership: Membership | null,
  operation: MosqueOperation,
): boolean {
  return Boolean(
    userId &&
    membership &&
    membership.userId === userId &&
    membership.mosqueId === mosqueId &&
    membership.status === "active" &&
    (["owner", "admin", "editor"].includes(membership.role) ||
      (membership.role === "moderator" && operation === "edit_schedule")) &&
    ["edit_schedule", "publish_schedule", "view_qr"].includes(operation),
  );
}
