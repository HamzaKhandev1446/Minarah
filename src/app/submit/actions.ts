"use server";
import { createClient } from "@/lib/supabase/server";
import { submissionSchema, registrationSchema } from "@/domain/onboarding";
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
    const registration = form.get("registration") === "1";
    if (registration && !values.sect)
      return {
        success: false,
        message: "Select the mosque’s sect / school of thought.",
      };
    const representative = registrationSchema.safeParse({
      ...values,
      moderators: [1, 2]
        .map((index) => ({
          name: values[`moderatorName${index}`],
          email: values[`moderatorEmail${index}`],
        }))
        .filter((item) => item.name || item.email),
    });
    if (registration && !representative.success)
      return {
        success: false,
        message:
          "Check your representative details and provide a name and unique email for each moderator (up to two).",
      };
    if (registration) {
      const { data } = await db.auth.getUser();
      if (!data.user)
        return {
          success: false,
          message: "Sign in before registering your mosque.",
        };
    }
    const { error } =
      registration && representative.success
        ? await db.rpc("register_mosque", {
            payload: payload.data,
            representative: representative.data,
          })
        : await db.rpc("submit_mosque", { payload: payload.data });
    if (error)
      return {
        message:
          error.code === "23505"
            ? "A matching mosque was already submitted recently. Please allow time for review."
            : "The submission could not be accepted. Check the details or try again later.",
        success: false,
      };
    return {
      message: registration
        ? "Mosque registration submitted for review. Owner access and moderator nominations activate only after approval."
        : "Mosque submitted for review. It is not verified, and this submission does not grant management access.",
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
