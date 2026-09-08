"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { claimSchema } from "@/domain/onboarding";
export async function submitClaim(
  _previous: { message: string; success: boolean },
  form: FormData,
) {
  const { db } = await requireUser();
  const parsed = claimSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      message:
        "Check your name, contact, role and explanation (at least 10 characters).",
      success: false,
    };
  const value = parsed.data;
  try {
    const { error } = await db.rpc("submit_mosque_claim", {
      target_mosque: value.mosqueId,
      claimant_name: value.name,
      contact_details: value.contact,
      mosque_role: value.role,
      explanation_text: value.explanation,
      supporting_text: value.supporting || null,
    });
    if (error)
      return {
        message:
          error.code === "23505"
            ? "You already have a pending claim for this mosque."
            : "Your claim could not be accepted. Check the mosque or try again later.",
        success: false,
      };
    revalidatePath("/claims");
    return {
      message:
        "Claim submitted. Management access is granted only after manual approval.",
      success: true,
    };
  } catch {
    return {
      message: "Claims are temporarily unavailable. Please try again.",
      success: false,
    };
  }
}
