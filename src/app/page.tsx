import { PublicExperience as Discovery } from "@/features/discovery/components/public-experience";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; view?: string }>;
}) {
  const { mode, view } = await searchParams;
  return (
    <Discovery
      key={`${mode === "demo" ? "demo" : "live"}:${view ?? "map"}`}
      mode={mode === "demo" ? "demo" : "live"}
      initialNow={new Date().toISOString()}
      initialView={view === "following" ? "following" : "map"}
    />
  );
}
