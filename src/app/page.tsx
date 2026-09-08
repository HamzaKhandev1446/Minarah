import { Discovery } from "@/components/discovery";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  return (
    <Discovery
      key={mode === "demo" ? "demo" : "live"}
      mode={mode === "demo" ? "demo" : "live"}
      initialNow={new Date().toISOString()}
    />
  );
}
