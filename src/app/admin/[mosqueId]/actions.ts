"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/server/auth";
import { scheduleDraftSchema } from "@/domain/validation";
export interface EditorState {
  message: string;
  draftId: string | null;
  revision: number | null;
  published: boolean;
}
export async function saveSchedule(
  _previous: EditorState,
  form: FormData,
): Promise<EditorState> {
  const mosqueId = z.uuid().parse(form.get("mosqueId"));
  const { db } = await requireMember(mosqueId);
  let draftId: string | null = null;
  let revision: number | null = null;
  try {
    const payload = scheduleDraftSchema.parse({
      ...JSON.parse(String(form.get("payload"))),
      mosqueId,
    });
    const intent = z.enum(["save", "publish"]).parse(form.get("intent"));
    draftId = form.get("draftId") ? z.uuid().parse(form.get("draftId")) : null;
    revision = form.get("revision")
      ? z.coerce.number().int().positive().parse(form.get("revision"))
      : null;
    const { data, error } = await db.rpc("save_schedule_draft", {
      target_mosque: mosqueId,
      effective_start: payload.effectiveFrom,
      effective_end: payload.effectiveTo,
      entries: payload.entries,
      friday_sessions: payload.jumuahSessions,
      overrides: payload.overrides,
      draft_id: draftId,
      expected_revision: revision,
    });
    if (error)
      return {
        message:
          error.code === "40001"
            ? "This draft changed elsewhere. Reload before saving again."
            : "Draft was not saved. Check dates, times and your membership.",
        draftId,
        revision,
        published: false,
      };
    draftId = z.uuid().parse(data);
    const saved = await db
      .from("jamaat_schedules")
      .select("revision")
      .eq("id", draftId)
      .single();
    if (saved.error) throw new Error("Unable to confirm saved draft.");
    revision = z.object({ revision: z.number() }).parse(saved.data).revision;
    if (intent === "publish") {
      const publication = await db.rpc("publish_schedule", {
        target_schedule: draftId,
        expected_revision: revision,
      });
      if (publication.error)
        return {
          message:
            "Draft saved, but publication failed. Reload if another editor changed it; otherwise check for an overlapping effective period. Public times have not changed.",
          draftId,
          revision,
          published: false,
        };
      revalidatePath(`/admin/${mosqueId}`);
      revalidatePath("/", "layout");
      return {
        message:
          "Published successfully. Public users will see these times when they refresh.",
        draftId: null,
        revision: null,
        published: true,
      };
    }
    revalidatePath(`/admin/${mosqueId}`);
    return {
      message: "Draft saved. Public times have not changed.",
      draftId,
      revision,
      published: false,
    };
  } catch {
    return {
      message:
        "Check all five times, dates, Friday sessions and overrides. Changes were not published.",
      draftId,
      revision,
      published: false,
    };
  }
}
