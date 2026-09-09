import Link from "next/link";
import { z } from "zod";
import { requireMember } from "@/server/auth";
import { mapAdminSchedule } from "@/server/public-mappers";
import { mosqueLocalDate } from "@/domain/schedule";
import { ScheduleEditor } from "@/components/schedule-editor";
export const dynamic = "force-dynamic";
export default async function ManageMosque({
  params,
  searchParams,
}: {
  params: Promise<{ mosqueId: string }>;
  searchParams: Promise<{ schedule?: string }>;
}) {
  const { mosqueId } = await params;
  const { db } = await requireMember(mosqueId, true);
  const { data: canManage, error: permissionError } = await db.rpc(
    "can_manage_mosque",
    { target_mosque: mosqueId },
  );
  if (permissionError)
    throw new Error("Your timetable permissions could not be loaded.");
  const limited = canManage !== true;
  const { data: mosqueData, error: mosqueError } = await db
    .from("mosques")
    .select("name,slug,timezone")
    .eq("id", mosqueId)
    .single();
  if (mosqueError) throw new Error("Mosque could not be loaded.");
  const mosque = z
    .object({ name: z.string(), slug: z.string(), timezone: z.string() })
    .parse(mosqueData);
  const { data, error } = await db
    .from("jamaat_schedules")
    .select(
      "id,mosque_id,effective_from,effective_to,status,revision,published_at,jamaat_schedule_entries(prayer,local_time),jumuah_sessions(position,local_time,label),schedule_overrides(local_date,prayer,local_time)",
    )
    .eq("mosque_id", mosqueId)
    .neq("status", "archived")
    .order("effective_from", { ascending: false })
    .limit(100);
  if (error) throw new Error("Schedules could not be loaded.");
  const schedules = z.array(z.unknown()).parse(data).map(mapAdminSchedule);
  const date = mosqueLocalDate(new Date().toISOString(), mosque.timezone);
  const selected = (await searchParams).schedule;
  const initial =
    selected === "new"
      ? null
      : (schedules.find((s) => s.id === selected) ??
        schedules.find(
          (s) =>
            s.status === "published" &&
            s.effectiveFrom <= date &&
            s.effectiveTo >= date,
        ) ??
        schedules[0] ??
        null);
  const history = await db
    .from("schedule_change_log")
    .select(
      "id,changed_by,change_type,effective_date,created_at,previous_value,new_value",
    )
    .eq("mosque_id", mosqueId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (history.error) throw new Error("Change history could not be loaded.");
  const audit = z
    .array(
      z.object({
        id: z.string(),
        changed_by: z.string().nullable(),
        change_type: z.string(),
        effective_date: z.string(),
        created_at: z.string(),
        previous_value: z.unknown(),
        new_value: z.unknown(),
      }),
    )
    .parse(history.data);
  return (
    <main id="main" className="directory-shell">
      <Link href="/admin">← My mosques</Link>
      <h1>{mosque.name}</h1>
      <p>
        All times use {mosque.timezone}. Last publication:{" "}
        {initial?.publishedAt
          ? new Date(initial.publishedAt).toLocaleString("en", {
              timeZone: mosque.timezone,
            })
          : "Not published for this draft"}
        .
      </p>
      <div className="actions">
        <Link href={`/mosques/${mosque.slug}`}>Public mosque page</Link>
        {!limited && <Link href={`/admin/${mosqueId}/qr`}>View Mosque QR</Link>}
        {!limited && (
          <Link
            className="button secondary"
            href={`/admin/${mosqueId}?schedule=new`}
          >
            New effective period
          </Link>
        )}
      </div>
      <details>
        <summary>Choose a schedule or draft</summary>
        <ul>
          {schedules.map((s) => (
            <li key={s.id}>
              <Link href={`/admin/${mosqueId}?schedule=${s.id}`}>
                {s.effectiveFrom} – {s.effectiveTo} · {s.status}
              </Link>
            </li>
          ))}
        </ul>
      </details>
      <ScheduleEditor
        key={initial?.id ?? "new"}
        mosqueId={mosqueId}
        initial={initial}
        localDate={date}
        limited={limited}
      />
      <h2>Publication history</h2>
      {!audit.length && <p>No publication changes recorded yet.</p>}
      {audit.map((change) => (
        <details key={change.id}>
          <summary>
            {change.change_type} · effective {change.effective_date} ·{" "}
            {new Date(change.created_at).toLocaleString("en", {
              timeZone: mosque.timezone,
            })}
          </summary>
          <p>Changed by: {change.changed_by ?? "Deleted account"}</p>
          <h3>Previous publication</h3>
          <pre>{JSON.stringify(change.previous_value, null, 2)}</pre>
          <h3>New publication</h3>
          <pre>{JSON.stringify(change.new_value, null, 2)}</pre>
        </details>
      ))}
    </main>
  );
}
