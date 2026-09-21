import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

// Real PostgreSQL/PostGIS execution. Only Supabase's auth schema/JWT context is
// supplied by this harness; migration SQL and RLS are run unchanged.
const db = new PGlite({ extensions: { postgis, btree_gist, pg_trgm } });
const mosque = "00000000-0000-4000-8000-000000000001";
const member = "20000000-0000-4000-8000-000000000001";
const stranger = "20000000-0000-4000-8000-000000000002";
const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"].map(
  (prayer, i) => ({
    prayer,
    localTime: ["05:30", "13:15", "17:00", "18:45", "20:45"][i],
  }),
);

async function asRole<T>(
  role: "anon" | "authenticated",
  user: string | null,
  callback: () => Promise<T>,
): Promise<T> {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    user ?? "",
  ]);
  try {
    return await callback();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

async function saveDraft(target = mosque, entries = prayers) {
  const result = await db.query<{ id: string }>(
    "select public.save_schedule_draft($1, '2030-01-01', '2030-01-31', $2::jsonb, $3::jsonb, $4::jsonb) as id",
    [
      target,
      JSON.stringify(entries),
      JSON.stringify([
        { position: 1, localTime: "13:15", label: null },
        { position: 2, localTime: "14:00", label: null },
      ]),
      JSON.stringify([
        { prayer: "isha", localDate: "2030-01-10", localTime: "21:00" },
      ]),
    ],
  );
  return result.rows[0]!.id;
}

beforeAll(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;`);
  for (const file of [
    "202609070001_foundation.sql",
    "202609070002_schedule_transactions.sql",
    "202609070003_public_distance.sql",
    "202609080004_onboarding_and_qr.sql",
    "202609090005_registration_moderators.sql",
    "202609090006_registration_classification.sql",
    "202609160007_ongoing_schedules.sql",
  ])
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  await db.exec(await readFile("supabase/seed.sql", "utf8"));
  await db.query("insert into auth.users values ($1), ($2)", [
    member,
    stranger,
  ]);
  await db.query(
    "insert into public.mosque_members(mosque_id, user_id, role) values ($1, $2, 'editor')",
    [mosque, member],
  );
});
afterAll(async () => {
  await db.close();
});

describe("migrations, PostGIS and row-level security", () => {
  it("reviews representatives, activates two confirmed nominees, and restricts moderators to daily-time drafts", async () => {
    const owner = "70000000-0000-4000-8000-000000000001";
    const mod = "70000000-0000-4000-8000-000000000002";
    const mod2 = "70000000-0000-4000-8000-000000000003";
    const reviewer = "70000000-0000-4000-8000-000000000004";
    for (const [id, email] of [
      [owner, "owner@example.test"],
      [mod, "mod@example.test"],
      [mod2, "mod2@example.test"],
      [reviewer, "reviewer@example.test"],
    ])
      await db.query(
        "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
        [id, email],
      );
    await db.query("insert into public.platform_admins(user_id) values($1)", [
      reviewer,
    ]);
    const payload = {
      name: "Registration acceptance mosque",
      addressLine: "Test address",
      city: "Registration city",
      countryCode: "PK",
      latitude: 11,
      longitude: 11,
      timezone: "Asia/Karachi",
    };
    const representative = {
      sect: "Hanafi",
      subSect: "Representative supplied",
      representativeName: "Owner name",
      representativeRole: "Imam",
      representativeContact: "test phone",
      authority: "Authorized representative for this test mosque.",
      moderators: [
        { name: "Moderator one", email: "mod@example.test" },
        { name: "Moderator two", email: "mod2@example.test" },
      ],
    };
    await asRole("anon", null, async () => {
      await expect(
        db.query("select public.register_mosque($1,$2)", [
          payload,
          representative,
        ]),
      ).rejects.toThrow();
    });
    const submission = await asRole("authenticated", owner, async () => {
      await expect(
        db.query("select public.register_mosque($1,$2)", [
          payload,
          { ...representative, sect: "invalid" },
        ]),
      ).rejects.toThrow();
      await expect(
        db.query("select public.register_mosque($1,$2)", [
          payload,
          {
            ...representative,
            moderators: [
              ...representative.moderators,
              { name: "Third", email: "third@example.test" },
            ],
          },
        ]),
      ).rejects.toThrow();
      return (
        await db.query<{ id: string }>(
          "select public.register_mosque($1,$2) as id",
          [payload, representative],
        )
      ).rows[0]!.id;
    });
    expect(
      (
        await db.query(
          "select sect,sub_sect from public.mosque_registrations where submission_id=$1",
          [submission],
        )
      ).rows,
    ).toEqual([{ sect: "Hanafi", sub_sect: "Representative supplied" }]);
    await asRole("authenticated", mod, async () => {
      expect(
        (await db.query("select * from public.mosque_registrations")).rows,
      ).toHaveLength(0);
      expect(
        (await db.query("select * from public.pending_moderator_nominations()"))
          .rows,
      ).toHaveLength(0);
      await expect(
        db.query("select public.review_mosque_registration($1,true)", [
          submission,
        ]),
      ).rejects.toThrow();
    });
    const target = await asRole(
      "authenticated",
      reviewer,
      async () =>
        (
          await db.query<{ id: string }>(
            "select public.review_mosque_registration($1,true) as id",
            [submission],
          )
        ).rows[0]!.id,
    );
    await asRole("authenticated", owner, async () => {
      expect(
        (
          await db.query(
            "select role from public.mosque_members where mosque_id=$1",
            [target],
          )
        ).rows,
      ).toEqual([{ role: "owner" }]);
      const draft = await saveDraft(target);
      await db.query("select public.publish_schedule($1,1)", [draft]);
    });
    const invitation = await asRole(
      "authenticated",
      mod,
      async () =>
        (
          await db.query<{ id: string }>(
            "select * from public.pending_moderator_nominations()",
          )
        ).rows[0]!.id,
    );
    await asRole("authenticated", stranger, async () => {
      await expect(
        db.query("select public.accept_moderator_nomination($1)", [invitation]),
      ).rejects.toThrow();
    });
    await db.query(
      "update auth.users set email_confirmed_at=null where id=$1",
      [mod],
    );
    await asRole("authenticated", mod, async () => {
      await expect(
        db.query("select public.accept_moderator_nomination($1)", [invitation]),
      ).rejects.toThrow();
    });
    await db.query(
      "update auth.users set email_confirmed_at=now() where id=$1",
      [mod],
    );
    await asRole("authenticated", mod, async () => {
      await db.query("select public.accept_moderator_nomination($1)", [
        invitation,
      ]);
      await expect(
        db.query("select public.accept_moderator_nomination($1)", [invitation]),
      ).rejects.toThrow();
      expect(
        (
          await db.query("select public.can_manage_mosque($1) as allowed", [
            target,
          ])
        ).rows,
      ).toEqual([{ allowed: false }]);
      const draft = await saveDraft(
        target,
        prayers.map((entry) =>
          entry.prayer === "isha" ? { ...entry, localTime: "21:15" } : entry,
        ),
      );
      await expect(
        db.query("select public.publish_schedule($1,1)", [draft]),
      ).rejects.toThrow();
      await expect(
        db.query("select public.ensure_mosque_qr($1)", [target]),
      ).rejects.toThrow();
      await expect(
        db.query(
          "select public.save_schedule_draft($1,'2031-01-01','2031-01-31',$2)",
          [target, prayers],
        ),
      ).rejects.toThrow();
      await expect(
        db.query(
          "select public.save_schedule_draft($1,'2030-01-01','2030-01-31',$2,'[]','[]',$3,1)",
          [target, prayers, draft],
        ),
      ).rejects.toThrow();
    });
    await asRole("authenticated", mod2, async () => {
      const id = (
        await db.query<{ id: string }>(
          "select * from public.pending_moderator_nominations()",
        )
      ).rows[0]!.id;
      await db.query("select public.accept_moderator_nomination($1)", [id]);
    });
    expect(
      (
        await db.query(
          "select role from public.mosque_members where mosque_id=$1 and role='moderator'",
          [target],
        )
      ).rows,
    ).toHaveLength(2);
    await asRole("anon", null, async () => {
      expect(
        (
          await db.query(
            "select * from public.jamaat_schedules where mosque_id=$1 and status='draft'",
            [target],
          )
        ).rows,
      ).toHaveLength(0);
    });
  });
  it("passes the operator's read-only release audit", async () => {
    await db.exec(await readFile("supabase/verify-release.sql", "utf8"));
  });
  it("reviews pending submissions and claims with platform-only membership grants", async () => {
    const payload = {
      name: "Review Test Mosque",
      addressLine: "12 Test Street",
      city: "Review City",
      countryCode: "PK",
      latitude: 10,
      longitude: 10,
      timezone: "Asia/Karachi",
    };
    const submission = await asRole("anon", null, async () => {
      const result = await db.query<{ id: string }>(
        "select public.submit_mosque($1::jsonb) as id",
        [JSON.stringify(payload)],
      );
      await expect(
        db.query("select public.submit_mosque($1::jsonb)", [
          JSON.stringify(payload),
        ]),
      ).rejects.toThrow("already pending");
      return result.rows[0]!.id;
    });
    await asRole("authenticated", stranger, async () => {
      await expect(
        db.query("select public.review_mosque_submission($1, true)", [
          submission,
        ]),
      ).rejects.toThrow("Platform administrator required");
    });
    await db.query("insert into public.platform_admins(user_id) values ($1)", [
      member,
    ]);
    try {
      const created = await asRole("authenticated", member, async () => {
        const result = await db.query<{ id: string }>(
          "select public.review_mosque_submission($1, true) as id",
          [submission],
        );
        await expect(
          db.query("select public.review_mosque_submission($1, true)", [
            submission,
          ]),
        ).rejects.toThrow("already reviewed");
        return result.rows[0]!.id;
      });
      expect(
        (
          await db.query(
            "select * from public.mosque_members where mosque_id = $1",
            [created],
          )
        ).rows,
      ).toHaveLength(0);
      expect(
        (
          await db.query<{ verification_status: string }>(
            "select verification_status from public.mosques where id = $1",
            [created],
          )
        ).rows[0]!.verification_status,
      ).toBe("unverified");
      const claim = await asRole("authenticated", stranger, async () => {
        await expect(
          db.query("select public.ensure_mosque_qr($1)", [created]),
        ).rejects.toThrow("membership required");
        return (
          await db.query<{ id: string }>(
            "select public.submit_mosque_claim($1, 'Test Person', 'test@example.test', 'Secretary', 'I represent this mosque.') as id",
            [created],
          )
        ).rows[0]!.id;
      });
      await asRole("authenticated", member, () =>
        db.query("select public.review_mosque_claim($1, true, 'admin')", [
          claim,
        ]),
      );
      await asRole("authenticated", stranger, async () => {
        expect(
          (
            await db.query<{ allowed: boolean }>(
              "select public.can_manage_mosque($1) as allowed",
              [created],
            )
          ).rows[0]!.allowed,
        ).toBe(true);
        const first = await db.query<{ code: string }>(
          "select public.ensure_mosque_qr($1) as code",
          [created],
        );
        const second = await db.query<{ code: string }>(
          "select public.ensure_mosque_qr($1) as code",
          [created],
        );
        expect(first.rows[0]!.code).toBe(second.rows[0]!.code);
      });
    } finally {
      await db.query("delete from public.platform_admins where user_id = $1", [
        member,
      ]);
    }
  });
  it("loads ten synthetic mosques and keeps all app tables under RLS", async () => {
    expect(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from public.mosques where is_synthetic",
        )
      ).rows[0]?.count,
    ).toBe(10);
    const rows = (
      await db.query<{ relname: string }>(
        "select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity",
      )
    ).rows;
    expect(rows).toEqual([]);
  });
  it("calculates detail distance with database permissions and coordinate validation", async () => {
    await asRole("anon", null, async () => {
      const result = await db.query<{ distance: number }>(
        "select public.mosque_distance($1, 24.8615, 67.011) as distance",
        [mosque],
      );
      expect(result.rows[0]?.distance).toBeCloseTo(0);
      expect(
        (
          await db.query<{ distance: number | null }>(
            "select public.mosque_distance('ffffffff-ffff-4fff-8fff-ffffffffffff', 0, 0) as distance",
          )
        ).rows[0]?.distance,
      ).toBeNull();
      await expect(
        db.query("select public.mosque_distance($1, 91, 0)", [mosque]),
      ).rejects.toThrow("Invalid coordinates");
    });
  });

  it("returns nearby mosques sorted by geodesic distance and respects radius", async () => {
    await asRole("anon", null, async () => {
      const result = await db.query<{ distance_meters: number; id: string }>(
        "select * from public.nearby_mosques(24.8615, 67.011, 5000, 20)",
      );
      expect(result.rows).toHaveLength(10);
      expect(result.rows[0]?.id).toBe(mosque);
      expect(result.rows[0]?.distance_meters).toBeCloseTo(0);
      expect(result.rows.map((row) => row.distance_meters)).toEqual(
        [...result.rows.map((row) => row.distance_meters)].sort(
          (a, b) => a - b,
        ),
      );
      expect(
        (
          await db.query(
            "select * from public.nearby_mosques(24.8615, 67.011, 100, 20)",
          )
        ).rows,
      ).toHaveLength(1);
      expect(
        (await db.query("select * from public.nearby_mosques(0, 0, 5000, 20)"))
          .rows,
      ).toHaveLength(0);
      await expect(
        db.query("select * from public.nearby_mosques(91, 0, 5000, 20)"),
      ).rejects.toThrow("Invalid nearby");
    });
  });
  it("searches names/cities while treating wildcard characters literally", async () => {
    await asRole("anon", null, async () => {
      expect(
        (await db.query("select * from public.search_mosques('cedar')")).rows,
      ).toHaveLength(1);
      expect(
        (await db.query("select * from public.search_mosques('Karachi')")).rows,
      ).toHaveLength(10);
      expect(
        (await db.query("select * from public.search_mosques('%%')")).rows,
      ).toHaveLength(0);
    });
  });
  it("resolves QR codes without exposing their table, including disabled/invalid cases", async () => {
    const code = (
      await db.query<{ code: string }>(
        "select code from public.mosque_qr_codes where mosque_id = $1",
        [mosque],
      )
    ).rows[0]!.code;
    expect(code).toMatch(/^[A-Za-z0-9_-]{22}$/);
    await asRole("anon", null, async () => {
      expect(
        (await db.query("select * from public.resolve_qr($1)", [code])).rows,
      ).toEqual([{ status: "active", mosque_slug: "sample-cedar" }]);
      expect(
        (await db.query("select * from public.resolve_qr('../bad')")).rows,
      ).toEqual([{ status: "invalid", mosque_slug: null }]);
      expect(
        (
          await db.query(
            "select * from public.resolve_qr('abcdefghijklmnopqrstuv')",
          )
        ).rows,
      ).toEqual([{ status: "invalid", mosque_slug: null }]);
      await expect(
        db.query("select * from public.mosque_qr_codes"),
      ).rejects.toThrow("permission denied");
    });
    await db.query(
      "update public.mosque_qr_codes set status = 'disabled' where code = $1",
      [code],
    );
    await asRole("anon", null, async () =>
      expect(
        (await db.query("select * from public.resolve_qr($1)", [code])).rows,
      ).toEqual([{ status: "disabled", mosque_slug: null }]),
    );
    await db.query(
      "update public.mosque_qr_codes set status = 'active' where code = $1",
      [code],
    );
  });
  it("blocks strangers, anonymous writes, self-granted membership and direct publication", async () => {
    await asRole("anon", null, async () => {
      await expect(saveDraft()).rejects.toThrow("permission denied");
    });
    await asRole("authenticated", stranger, async () => {
      await expect(saveDraft()).rejects.toThrow("membership required");
      await expect(
        db.query(
          "insert into public.mosque_members(mosque_id,user_id,role) values($1,$2,'owner')",
          [mosque, stranger],
        ),
      ).rejects.toThrow("permission denied");
      await expect(
        db.query("insert into public.platform_admins(user_id) values($1)", [
          stranger,
        ]),
      ).rejects.toThrow("permission denied");
    });
    await asRole("authenticated", member, async () => {
      await expect(
        db.query("update public.jamaat_schedules set status = 'published'"),
      ).rejects.toThrow("permission denied");
      await expect(
        db.query(
          "update public.jamaat_schedule_entries set local_time = '21:00'",
        ),
      ).rejects.toThrow("permission denied");
      await expect(
        saveDraft("00000000-0000-4000-8000-000000000002"),
      ).rejects.toThrow("membership required");
    });
  });
  it("keeps drafts and their children private, publishes atomically, and audits replacement", async () => {
    const draft = await asRole("authenticated", member, () => saveDraft());
    await asRole("anon", null, async () => {
      expect(
        (
          await db.query(
            "select * from public.jamaat_schedules where id = $1",
            [draft],
          )
        ).rows,
      ).toHaveLength(0);
      for (const table of [
        "jamaat_schedule_entries",
        "jumuah_sessions",
        "schedule_overrides",
      ])
        expect(
          (
            await db.query(
              `select * from public.${table} where schedule_id = $1`,
              [draft],
            )
          ).rows,
        ).toHaveLength(0);
    });
    await asRole("authenticated", member, async () => {
      await expect(
        db.query("select public.publish_schedule($1, 2)", [draft]),
      ).rejects.toThrow("Draft changed");
      await db.query("select public.publish_schedule($1, 1)", [draft]);
    });
    await asRole("anon", null, async () => {
      expect(
        (
          await db.query(
            "select * from public.jamaat_schedule_entries where schedule_id = $1",
            [draft],
          )
        ).rows,
      ).toHaveLength(5);
      expect(
        (
          await db.query(
            "select * from public.jumuah_sessions where schedule_id = $1",
            [draft],
          )
        ).rows,
      ).toHaveLength(2);
    });
    const replacement = await asRole("authenticated", member, () =>
      saveDraft(),
    );
    await asRole("authenticated", member, async () => {
      await db.query("select public.publish_schedule($1, 1)", [replacement]);
    });
    const audit = (
      await db.query<{
        previous_value: unknown;
        new_value: unknown;
        change_type: string;
      }>("select * from public.schedule_change_log where schedule_id = $1", [
        replacement,
      ])
    ).rows[0]!;
    expect(audit.change_type).toBe("replace");
    expect(audit.previous_value).not.toBeNull();
    expect(audit.new_value).toHaveProperty("overrides");
    expect(
      (
        await db.query<{ status: string }>(
          "select status from public.jamaat_schedules where id = $1",
          [draft],
        )
      ).rows[0]?.status,
    ).toBe("archived");
    await asRole("authenticated", member, async () => {
      await expect(
        db.query("delete from public.schedule_change_log"),
      ).rejects.toThrow("permission denied");
    });
  });
  it("rejects invalid inputs and rolls back failed overlapping publication", async () => {
    await asRole("authenticated", member, async () => {
      await expect(saveDraft(mosque, prayers.slice(1))).rejects.toThrow(
        "five prayers",
      );
      await expect(
        saveDraft(
          mosque,
          prayers.map((p) => ({ ...p, localTime: "25:00" })),
        ),
      ).rejects.toThrow("HH:mm");
      const result = await db.query<{ id: string }>(
        "select public.save_schedule_draft($1, '2030-01-15', '2030-02-15', $2::jsonb) as id",
        [mosque, JSON.stringify(prayers)],
      );
      const id = result.rows[0]!.id;
      await expect(
        db.query("select public.publish_schedule($1, 1)", [id]),
      ).rejects.toThrow("exclusion constraint");
      expect(
        (
          await db.query<{ status: string }>(
            "select status from public.jamaat_schedules where id = $1",
            [id],
          )
        ).rows[0]?.status,
      ).toBe("draft");
      expect(
        (
          await db.query(
            "select * from public.schedule_change_log where schedule_id = $1",
            [id],
          )
        ).rows,
      ).toHaveLength(0);
    });
  });
  it("rejects stale draft saves without losing the current entries", async () => {
    await asRole("authenticated", member, async () => {
      const id = await saveDraft();
      const changed = prayers.map((entry) =>
        entry.prayer === "isha" ? { ...entry, localTime: "21:15" } : entry,
      );
      await db.query(
        "select public.save_schedule_draft($1, '2030-01-01', '2030-01-31', $2::jsonb, '[]', '[]', $3, 1)",
        [mosque, JSON.stringify(changed), id],
      );
      await expect(
        db.query(
          "select public.save_schedule_draft($1, '2030-01-01', '2030-01-31', $2::jsonb, '[]', '[]', $3, 1)",
          [mosque, JSON.stringify(prayers), id],
        ),
      ).rejects.toThrow("Draft changed");
      expect(
        (
          await db.query<{ local_time: string }>(
            "select local_time from public.jamaat_schedule_entries where schedule_id = $1 and prayer = 'isha'",
            [id],
          )
        ).rows[0]?.local_time,
      ).toBe("21:15:00");
      await expect(
        db.query("select public.schedule_snapshot($1)", [id]),
      ).rejects.toThrow("permission denied");
    });
  });

  it("keeps rejected mosques and private contact records out of public reads", async () => {
    const rejected = "00000000-0000-4000-8000-000000000003";
    await db.query(
      "update public.mosques set verification_status = 'rejected' where id = $1",
      [rejected],
    );
    await asRole("anon", null, async () => {
      expect(
        (
          await db.query("select * from public.mosques where id = $1", [
            rejected,
          ])
        ).rows,
      ).toHaveLength(0);
      expect(
        (
          await db.query(
            "select * from public.jamaat_schedules where mosque_id = $1",
            [rejected],
          )
        ).rows,
      ).toHaveLength(0);
      for (const table of [
        "mosque_claims",
        "mosque_submissions",
        "profiles",
        "schedule_change_log",
      ])
        await expect(db.query(`select * from public.${table}`)).rejects.toThrow(
          "permission denied",
        );
    });
    await db.query(
      "update public.mosques set verification_status = 'unverified' where id = $1",
      [rejected],
    );
  });

  it("blocks suspended members and invalid mosque timezones", async () => {
    await db.query(
      "update public.mosque_members set status = 'suspended' where user_id = $1",
      [member],
    );
    await asRole("authenticated", member, async () => {
      await expect(saveDraft()).rejects.toThrow("membership required");
    });
    await db.query(
      "update public.mosque_members set status = 'active' where user_id = $1",
      [member],
    );
    await expect(
      db.query(
        "update public.mosques set timezone = 'not-a-timezone' where id = $1",
        [mosque],
      ),
    ).rejects.toThrow("Unknown IANA timezone");
  });
});

it("imports the requested Parsa Citi locations idempotently without schedules", async () => {
  const sql = await readFile("supabase/add-parsa-citi-mosques.sql", "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const locations = await db.query<{
    name: string;
    latitude: number;
    longitude: number;
    verification_status: string;
    is_synthetic: boolean;
  }>(
    "select name, latitude, longitude, verification_status, is_synthetic from public.mosques where slug in ('parsa-citi-block-g-masjid','parsa-citi-block-a-masjid') order by name",
  );
  expect(locations.rows).toEqual([
    {
      name: "Parsa Citi Block A Masjid",
      latitude: 24.871662970560166,
      longitude: 67.02411936777554,
      verification_status: "unverified",
      is_synthetic: false,
    },
    {
      name: "Parsa Citi Block G Masjid",
      latitude: 24.870630810049292,
      longitude: 67.02463726936347,
      verification_status: "unverified",
      is_synthetic: false,
    },
  ]);
  const schedules = await db.query(
    "select s.id from public.jamaat_schedules s join public.mosques m on m.id=s.mosque_id where m.slug in ('parsa-citi-block-g-masjid','parsa-citi-block-a-masjid')",
  );
  expect(schedules.rows).toEqual([]);
});

it("publishes ongoing Block G times and preserves replacement history", async () => {
  const sql = await readFile(
    "supabase/publish-parsa-citi-block-g-times.sql",
    "utf8",
  );
  await db.exec(sql);
  await db.exec(sql);
  const result = await db.query<{ status: string; id: string }>(
    "select s.id, s.status from public.jamaat_schedules s join public.mosques m on m.id = s.mosque_id where m.slug = 'parsa-citi-block-g-masjid' order by s.status",
  );
  expect(result.rows.map((row) => row.status)).toEqual([
    "archived",
    "published",
  ]);
  const current = result.rows[1]!.id;
  await asRole("anon", null, async () => {
    const entries = await db.query(
      "select prayer, local_time::text from public.jamaat_schedule_entries where schedule_id = $1 order by local_time",
      [current],
    );
    expect(entries.rows).toEqual([
      { prayer: "fajr", local_time: "05:30:00" },
      { prayer: "dhuhr", local_time: "13:15:00" },
      { prayer: "asr", local_time: "17:15:00" },
      { prayer: "maghrib", local_time: "18:42:00" },
      { prayer: "isha", local_time: "20:15:00" },
    ]);
    expect(
      (
        await db.query(
          "select local_time::text from public.jumuah_sessions where schedule_id = $1",
          [current],
        )
      ).rows,
    ).toEqual([{ local_time: "13:45:00" }]);
  });
  const audit = await db.query<{
    change_type: string;
    previous_value: unknown;
  }>(
    "select change_type, previous_value from public.schedule_change_log where schedule_id = $1",
    [current],
  );
  expect(audit.rows[0]!.change_type).toBe("replace");
  expect(audit.rows[0]!.previous_value).not.toBeNull();
  const dates = await db.query<{ effective_to: null; published_at: string }>(
    "select effective_to, published_at::text from public.jamaat_schedules where id = $1",
    [current],
  );
  expect(dates.rows[0]!.effective_to).toBeNull();
  const prior = await db.query<{ published_at: string }>(
    "select published_at::text from public.jamaat_schedules where id = $1",
    [result.rows[0]!.id],
  );
  expect(dates.rows[0]!.published_at).not.toBe(prior.rows[0]!.published_at);
  expect(
    (
      await db.query(
        "select status from public.jamaat_schedules where id = $1",
        [current],
      )
    ).rows,
  ).toEqual([{ status: "published" }]);
  expect(
    (
      await db.query(
        "select s.id from public.jamaat_schedules s join public.mosques m on m.id=s.mosque_id where m.slug = 'parsa-citi-block-a-masjid'",
      )
    ).rows,
  ).toEqual([]);
});

it("keeps ongoing drafts private, restricts publication and updates freshness only on publish", async () => {
  const target = (
    await db.query<{ id: string }>(
      "select id from public.mosques where slug='parsa-citi-block-g-masjid'",
    )
  ).rows[0]!.id;
  await db.query(
    "insert into public.mosque_members(mosque_id,user_id,role) values ($1,$2,'owner'),($1,$3,'moderator')",
    [target, member, stranger],
  );
  const before = (
    await db.query<{
      id: string;
      published_at: string;
      effective_from: string;
    }>(
      "select id,published_at::text,effective_from::text from public.jamaat_schedules where mosque_id=$1 and status='published'",
      [target],
    )
  ).rows[0]!;
  let saved = "";
  const friday = [{ position: 1, localTime: "13:45", label: "Jumuah" }];
  await asRole("authenticated", stranger, async () => {
    const result = await db.query<{ id: string }>(
      "select public.save_schedule_draft($1,$2,null,$3::jsonb,$4::jsonb) as id",
      [
        target,
        before.effective_from,
        JSON.stringify(prayers),
        JSON.stringify(friday),
      ],
    );
    saved = result.rows[0]!.id;
    await expect(
      db.query("select public.publish_schedule($1,1)", [saved]),
    ).rejects.toThrow("membership required");
    await expect(
      db.query("select public.publish_schedule_bundle($1,1)", [saved]),
    ).rejects.toThrow("permission denied");
    await expect(
      db.query(
        "select public.save_schedule_draft($1,$2,null,$3::jsonb,'[]'::jsonb)",
        [target, before.effective_from, JSON.stringify(prayers)],
      ),
    ).rejects.toThrow("daily times only");
  });
  await asRole("anon", null, async () => {
    expect(
      (
        await db.query("select id from public.jamaat_schedules where id=$1", [
          saved,
        ])
      ).rows,
    ).toEqual([]);
    expect(
      (
        await db.query(
          "select published_at::text from public.jamaat_schedules where id=$1",
          [before.id],
        )
      ).rows,
    ).toEqual([{ published_at: before.published_at }]);
    await expect(
      db.query("select public.publish_schedule_bundle($1,1)", [saved]),
    ).rejects.toThrow("permission denied");
  });
  await asRole("authenticated", member, async () => {
    await expect(
      db.query("select public.publish_schedule($1,9)", [saved]),
    ).rejects.toThrow("reload before publishing");
    await db.query("select public.publish_schedule($1,1)", [saved]);
  });
  const after = await db.query<{ id: string; published_at: string }>(
    "select id,published_at::text from public.jamaat_schedules where mosque_id=$1 and status='published'",
    [target],
  );
  expect(after.rows).toHaveLength(1);
  expect(after.rows[0]!.id).toBe(saved);
  expect(after.rows[0]!.published_at).not.toBe(before.published_at);
});

it("replaces multiple bounded plans with one ongoing bundle and audits every previous version", async () => {
  const target = (
    await db.query<{
      id: string;
    }>(`insert into public.mosques(slug,name,address_line,city,country_code,latitude,longitude,timezone)
    values ('ongoing-test','Ongoing test','Test road','Karachi','PK',24.87,67.02,'Asia/Karachi') returning id`)
  ).rows[0]!.id;
  await db.query(
    "insert into public.mosque_members(mosque_id,user_id,role) values ($1,$2,'owner')",
    [target, member],
  );
  await asRole("authenticated", member, async () => {
    for (const month of ["01", "02"]) {
      const id = (
        await db.query<{ id: string }>(
          "select public.save_schedule_draft($1,$2,$3,$4::jsonb) as id",
          [
            target,
            `2031-${month}-01`,
            `2031-${month}-28`,
            JSON.stringify(prayers),
          ],
        )
      ).rows[0]!.id;
      await db.query("select public.publish_schedule($1,1)", [id]);
    }
    const id = (
      await db.query<{ id: string }>(
        "select public.save_schedule_draft($1,'2031-01-01',null,$2::jsonb) as id",
        [target, JSON.stringify(prayers)],
      )
    ).rows[0]!.id;
    await db.query("select public.publish_schedule($1,1)", [id]);
    const audit = (
      await db.query<{ previous_value: unknown[] }>(
        "select previous_value from public.schedule_change_log where schedule_id=$1",
        [id],
      )
    ).rows[0]!;
    expect(audit.previous_value).toHaveLength(2);
    expect(
      (
        await db.query(
          "select id from public.jamaat_schedules where mosque_id=$1 and status='published'",
          [target],
        )
      ).rows,
    ).toEqual([{ id }]);
    await expect(
      db.query("select public.publish_schedule($1,1)", [id]),
    ).rejects.toThrow("reload before publishing");
  });
});
