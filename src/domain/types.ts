export const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type Prayer = (typeof PRAYERS)[number];
export type CongregationPrayer = Prayer | "jumuah";
export type VerificationStatus =
  "unverified" | "pending" | "verified" | "rejected";
export type MemberRole = "owner" | "admin" | "editor" | "moderator";

export interface Mosque {
  id: string;
  slug: string;
  name: string;
  addressLine: string;
  locality: string;
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  verificationStatus: VerificationStatus;
  isSynthetic: boolean;
}

export interface ScheduleEntry {
  prayer: Prayer;
  localTime: string;
}
export interface JumuahSession {
  position: number;
  localTime: string;
  label: string | null;
}
export interface ScheduleOverride extends ScheduleEntry {
  localDate: string;
}
export interface JamaatSchedule {
  id: string;
  mosqueId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: "draft" | "published" | "archived";
  revision: number;
  publishedAt: string | null;
  entries: ScheduleEntry[];
  jumuahSessions: JumuahSession[];
  overrides: ScheduleOverride[];
}

export interface ResolvedSchedule {
  mosqueId: string;
  localDate: string;
  scheduleId: string | null;
  publishedAt: string | null;
  entries: ScheduleEntry[];
  jumuahSessions: JumuahSession[];
}

export interface NextJamaat {
  prayer: CongregationPrayer;
  label: string;
  jamaatLocalTime: string;
  jamaatInstant: string;
  date: string;
  timeRemainingMs: number;
}
