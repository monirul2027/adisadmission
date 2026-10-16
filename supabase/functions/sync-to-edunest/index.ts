import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const EDUNEST_URL = "https://myedunest.lovable.app/api/public/admission-sync";
const CLASS_OPTIONS = ["LKG", "UKG", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const normalizeClass = (value: unknown) => {
  if (typeof value !== "string") return "";
  const normalized = value.trim().replace(/^class\s+/i, "").toUpperCase();
  return CLASS_OPTIONS.includes(normalized) ? normalized : "";
};

const sendFeePortal = async (data: any, section: string, rollNumber: string, admissionFee: number, monthlyFee: number) => {
  const feePortalUrl = Deno.env.get("FEE_PORTAL_WEBHOOK_URL");
  const feeWebhookSecret = Deno.env.get("FEE_WEBHOOK_SECRET");
  if (!feePortalUrl || !feeWebhookSecret) {
    console.error("Fee Portal sync skipped: FEE_PORTAL_WEBHOOK_URL or FEE_WEBHOOK_SECRET is not configured");
    return { ok: false, error: "Fee Portal webhook settings are not configured." };
  }

  try {
    const response = await fetch(feePortalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${feeWebhookSecret}` },
      body: JSON.stringify({
        name: data.full_name,
        guardian_name: data.father_name,
        class: normalizeClass(data.desired_class),
        section,
        roll_number: rollNumber,
        admission_fee: admissionFee,
        monthly_fee: monthlyFee,
        village: data.present_vill,
        phone: data.mobile_no,
        student_code: data.student_code,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (response.ok) return { ok: true, error: null };
    const responseText = (await response.text()).trim();
    const detail = responseText && responseText.length <= 300 ? ` ${responseText}` : "";
    const error = `Fee Portal responded with HTTP ${response.status}.${detail}`;
    console.error("Fee Portal sync failed", response.status, responseText.slice(0, 1000));
    return { ok: false, error };
  } catch (error) {
    console.error("Fee Portal sync failed", error);
    return { ok: false, error: error instanceof Error && error.name === "TimeoutError" ? "Fee Portal request timed out." : "Fee Portal request failed. Check the connection and webhook settings." };
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const secret = Deno.env.get("ADMISSION_WEBHOOK_SECRET");
    if (!secret) return json({ error: "Sync secret is not configured" }, 500);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    if (claimsError || !userId) return json({ error: "Invalid token" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    if (!roles?.some((role) => role.role === "admin")) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => null);
    const applicationId = body?.application_id;
    if (typeof applicationId !== "string" || !/^[0-9a-f-]{36}$/i.test(applicationId)) {
      return json({ error: "application_id is required" }, 400);
    }

    const { data, error } = await admin.from("applications").select("*").eq("id", applicationId).maybeSingle();
    if (error || !data) return json({ error: "Application not found" }, 404);
    if (data.status !== "Approved" || !data.student_code) return json({ error: "Application is not approved" }, 400);

    if (body?.retry_fee_portal === true) {
      if (!data.is_synced) return json({ error: "EduNest sync must succeed before retrying Fee Portal" }, 409);
      if (data.is_fee_synced || data.fee_sync_status === "synced") {
        return json({ success: true, fee_sync_status: "synced", fee_sync_error: null, student_code: data.student_code });
      }
      const admissionFee = Number(data.fee_sync_admission_fee ?? 0);
      const monthlyFee = Number(data.fee_sync_monthly_fee ?? 0);
      if (admissionFee <= 0 && monthlyFee <= 0) return json({ error: "No Fee Portal sync was requested for this student" }, 400);
      const section = data.fee_sync_section;
      if (!section || !["GREEN", "VIOLET", "BLUE", "ORANGE"].includes(section)) return json({ error: "Saved Fee Portal section is missing or invalid" }, 409);

      const { error: pendingError } = await admin.from("applications").update({ fee_sync_status: "pending", fee_sync_error: null }).eq("id", applicationId);
      if (pendingError) return json({ error: "Could not record Fee Portal retry state" }, 500);
      const feeResult = await sendFeePortal(data, section, data.fee_sync_roll_number || "", admissionFee, monthlyFee);
      const { error: resultError } = await admin.from("applications").update({
        is_fee_synced: feeResult.ok,
        fee_sync_status: feeResult.ok ? "synced" : "failed",
        fee_sync_error: feeResult.error,
      }).eq("id", applicationId);
      if (resultError) console.error("Could not persist Fee Portal retry result", resultError);
      const feeStatus = resultError && feeResult.ok ? "pending" : feeResult.ok ? "synced" : "failed";
      const feeError = resultError && feeResult.ok ? "Fee Portal confirmed the sync, but the portal could not save the confirmation. Verify the Fee Portal record before retrying." : feeResult.error;
      return json({ success: true, fee_sync_status: feeStatus, fee_sync_error: feeError, student_code: data.student_code });
    }

    if (data.is_synced) return json({ error: "Already synced to EduNest. Use the Fee Portal retry action if needed." }, 409);

    const section = body?.section;
    if (!["GREEN", "VIOLET", "BLUE", "ORANGE"].includes(section)) {
      return json({ error: "A valid section (GREEN, VIOLET, BLUE, ORANGE) is required" }, 400);
    }
    const rollNumber = typeof body?.roll_number === "string" ? body.roll_number.trim().slice(0, 64) : "";
    const admissionFee = Number(body?.admission_fee ?? 0);
    const monthlyFee = Number(body?.monthly_fee ?? 0);
    if (!Number.isFinite(admissionFee) || admissionFee < 0 || !Number.isFinite(monthlyFee) || monthlyFee < 0) {
      return json({ error: "admission_fee and monthly_fee must be non-negative numbers" }, 400);
    }

    // Keep the existing EduNest endpoint and payload mapping. Only normalize legacy class labels.
    const className = normalizeClass(data.desired_class);
    if (!className) return json({ error: "The application's class value is invalid. Update it to an allowed class before syncing." }, 400);
    const payload = {
      student_code: data.student_code,
      full_name: data.full_name,
      guardian_name: data.father_name,
      contact: data.mobile_no,
      village: data.present_vill,
      po: data.present_po,
      ps: data.present_ps,
      dist: data.present_dist,
      class_name: className,
      session_year: data.session,
      section,
    };

    const res = await fetch(EDUNEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify(payload),
    });
    const responseText = await res.text();
    if (!res.ok) {
      console.error("EduNest sync failed", res.status, responseText);
      let parsed: any = null;
      try { parsed = JSON.parse(responseText); } catch { /* non-JSON body */ }
      const pick = (value: unknown) => (typeof value === "string" ? value : value ? JSON.stringify(value) : "");
      const detail = pick(parsed?.error) || pick(parsed?.message) || pick(parsed?.detail) ||
        (responseText && responseText.trim().length < 300 ? responseText.trim() : "") || `EduNest responded with HTTP ${res.status}`;
      return json({ success: false, status: res.status, error: `EduNest (${res.status}): ${detail}` }, 502);
    }

    const shouldSyncFees = admissionFee > 0 || monthlyFee > 0;
    const { error: eduNestStateError } = await admin.from("applications").update({
      is_synced: true,
      fee_sync_section: section,
      fee_sync_roll_number: rollNumber,
      fee_sync_admission_fee: admissionFee,
      fee_sync_monthly_fee: monthlyFee,
      is_fee_synced: false,
      fee_sync_status: shouldSyncFees ? "pending" : "not_requested",
      fee_sync_error: null,
    }).eq("id", applicationId);
    if (eduNestStateError) {
      console.error("EduNest accepted the student but sync state could not be persisted", eduNestStateError);
      return json({ success: false, edunest_synced: true, error: "EduNest accepted the student, but the portal could not save the sync state. Contact an administrator before retrying." }, 500);
    }

    if (!shouldSyncFees) return json({ success: true, fee_sync_status: "not_requested", fee_sync_error: null, student_code: data.student_code });

    const feeResult = await sendFeePortal(data, section, rollNumber, admissionFee, monthlyFee);
    const { error: feeStateError } = await admin.from("applications").update({
      is_fee_synced: feeResult.ok,
      fee_sync_status: feeResult.ok ? "synced" : "failed",
      fee_sync_error: feeResult.error,
    }).eq("id", applicationId);
    if (feeStateError) console.error("Could not persist Fee Portal sync result", feeStateError);

    const feeStatus = feeStateError && feeResult.ok ? "pending" : feeResult.ok ? "synced" : "failed";
    const feeError = feeStateError && feeResult.ok ? "Fee Portal confirmed the sync, but the portal could not save the confirmation. Verify the Fee Portal record before retrying." : feeResult.error;
    return json({ success: true, fee_sync_status: feeStatus, fee_sync_error: feeError, student_code: data.student_code });
  } catch (err) {
    console.error("sync-to-edunest error", err);
    return json({ success: false, error: "Sync failed" }, 500);
  }
});
