import { SubmissionForm } from "@/components/submission-form";
import { getSupabaseConfig } from "@/lib/config";
export const dynamic = "force-dynamic";
export default function SubmitPage() {
  const configured = Boolean(getSupabaseConfig());
  return (
    <main id="main" className="detail-shell">
      <h1>Add a mosque</h1>
      <p>
        Can’t find your mosque? Submit its details for review. No account is
        required, and submitting a mosque does not give you permission to manage
        it.
      </p>
      {!configured && (
        <p className="notice">
          Live submissions are not connected yet. This form cannot save details
          until Supabase is configured.
        </p>
      )}
      <SubmissionForm configured={configured} />
    </main>
  );
}
