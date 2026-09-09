"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { z } from "zod";
export async function acceptNomination(
  _state: { message: string },
  form: FormData,
) {
  const { db } = await requireUser();
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { message: "Invalid nomination." };
  const { error } = await db.rpc("accept_moderator_nomination", {
    nomination_id: id.data,
  });
  if (error)
    return {
      message:
        "Could not accept. Confirm your nominated email account, or ask the representative to check your nomination.",
    };
  revalidatePath("/admin");
  return {
    message:
      "Moderator access accepted. You can save daily prayer-time drafts for the owner to publish.",
  };
}
