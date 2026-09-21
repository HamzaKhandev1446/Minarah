"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/server/auth";
import { scheduleDraftSchema } from "@/domain/validation";
import { reportOperationalEvent } from "@/server/operational-events";
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
  const { db } = await requireMember(
    mosqueId,
    form.get("intent") !== "publish",
  );
  let draftId: string | null = null;
  let revision: number | null = null;
  try {
    // Preserve the edit identity even when the schedule payload is invalid.
    draftId = form.get("draftId") ? z.uuid().parse(form.get("draftId")) : null;
    revision = form.get("revision")
      ? z.coerce.number().int().positive().parse(form.get("revision"))
      : null;
    const payload = scheduleDraftSchema.parse({
      ...JSON.parse(String(form.get("payload"))),
      mosqueId,
    });
    const intent = z.enum(["save", "publish"]).parse(form.get("intent"));
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
    // The RPC creates revision 1 or increments the expected revision once.
    // A subsequent SELECT could observe another editor's save and accidentally
    // authorize publishing changes that this editor has never reviewed.
    revision = draftId === null ? 1 : revision! + 1;
    draftId = z.uuid().parse(data);
    if (intent === "publish") {
      const publication = await db.rpc("publish_schedule", {
        target_schedule: draftId,
        expected_revision: revision,
      });
      if (publication.error) {
        reportOperationalEvent("publication_failed");
        return {
          message:
            "Draft saved, but publication failed. Reload to check for another editor's changes. Public times have not changed.",
          draftId,
          revision,
          published: false,
        };
      }
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
