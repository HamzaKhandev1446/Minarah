"use server";
import { createClient } from "@/lib/supabase/server";
import { submissionSchema } from "@/domain/onboarding";
import { getSupabaseConfig } from "@/lib/config";
export interface SubmissionState {
  message: string;
  success: boolean;
}
export async function submitMosque(
  _previous: SubmissionState,
  form: FormData,
): Promise<SubmissionState> {
  if (!getSupabaseConfig())
    return {
      message:
        "Submissions are not connected yet. Your details have not been saved.",
      success: false,
    };
  if (form.get("company"))
    return { message: "Submission could not be accepted.", success: false };
  const values = Object.fromEntries(form);
  const payload = submissionSchema.safeParse({
    ...values,
    latitude: values.latitude ? Number(values.latitude) : NaN,
    longitude: values.longitude ? Number(values.longitude) : NaN,
  });
  if (!payload.success)
    return {
      message:
        "Check the name, address, country code, coordinates, timezone and optional website.",
      success: false,
    };
  try {
    const db = await createClient();
    const { error } = await db.rpc("submit_mosque", { payload: payload.data });
    if (error)
      return {
        message:
          error.code === "23505"
            ? "A matching mosque was already submitted recently. Please allow time for review."
            : "The submission could not be accepted. Check the details or try again later.",
        success: false,
      };
    return {
      message:
        "Mosque submitted for review. It is not verified, and this submission does not grant management access.",
      success: true,
    };
  } catch {
    return {
      message:
        "Submissions are temporarily unavailable. Your details have not been saved.",
      success: false,
    };
  }
}
