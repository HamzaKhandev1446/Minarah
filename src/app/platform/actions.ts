"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/server/auth";
export async function reviewRecord(
  _previous: { message: string },
  form: FormData,
) {
  const { db } = await requirePlatformAdmin();
  const parsed = z
    .object({
      id: z.uuid(),
      kind: z.enum(["claim", "submission", "registration"]),
      decision: z.enum(["approve", "reject"]),
      role: z.enum(["owner", "admin", "editor"]).default("admin"),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: "Invalid review request." };
  const value = parsed.data;
  try {
    const result =
      value.kind === "claim"
        ? await db.rpc("review_mosque_claim", {
            claim_id: value.id,
            approve: value.decision === "approve",
            member_role: value.role,
          })
        : await db.rpc(
            value.kind === "registration"
              ? "review_mosque_registration"
              : "review_mosque_submission",
            {
              submission_id: value.id,
              approve: value.decision === "approve",
            },
          );
    if (result.error)
      return {
        message:
          "Review failed. This record may already have been reviewed. Reload and check before retrying.",
      };
    revalidatePath("/platform");
    revalidatePath("/admin");
    revalidatePath("/claims");
    return {
      message: `${value.kind === "claim" ? "Claim" : "Submission"} ${value.decision === "approve" ? "approved" : "rejected"}.`,
    };
  } catch {
    return { message: "Review is temporarily unavailable." };
  }
}
